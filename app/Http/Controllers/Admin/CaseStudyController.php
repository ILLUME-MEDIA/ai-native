<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CaseStudyController extends Controller
{
    private string $table        = 'case_studies';
    private string $sectionsTable = 'case_study_sections';
    private string $groupsTable  = 'case_study_groups';
    private string $groupPivot   = 'case_study_group';

    // ── LIST (supports DataTables server-side + simple pagination) ────────
    public function index(Request $request)
    {
        $query = DB::table($this->table)->orderBy('created_at', 'desc');

        // Search: DataTables sends search[value], plain sends search
        $search = $request->input('search');
        if (is_array($search)) {
            $search = $search['value'] ?? '';
        }
        $search = trim((string) $search);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%")
                  ->orWhere('client_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== '') {
            $query->where('status', (int) $request->status);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('group_id')) {
            $pivot = $this->groupPivot;
            $gid   = (int) $request->group_id;
            $query->whereIn('id', function ($sub) use ($pivot, $gid) {
                $sub->select('case_study_id')->from($pivot)->where('case_study_group_id', $gid);
            });
        }

        $total    = $query->count();
        $draw     = $request->input('draw');

        if ($draw !== null) {
            // DataTables server-side mode
            $start  = (int) $request->input('start', 0);
            $length = (int) $request->input('length', 10);
            $items  = (clone $query)->skip($start)->take($length)->get();
        } else {
            $perPage = max(1, (int) $request->get('per_page', 15));
            $page    = max(1, (int) $request->get('page', 1));
            $items   = (clone $query)->skip(($page - 1) * $perPage)->take($perPage)->get();
        }

        // Decode tags + attach groups
        $items = $items->map(function ($item) {
            $item->tags   = json_decode($item->tags ?? '[]', true) ?? [];
            $item->groups = $this->getItemGroups($item->id);
            return $item;
        });

        if ($draw !== null) {
            return response()->json([
                'draw'            => (int) $draw,
                'recordsTotal'    => $total,
                'recordsFiltered' => $total,
                'data'            => $items,
            ]);
        }

        return response()->json([
            'data'         => $items,
            'total'        => $total,
            'per_page'     => $perPage ?? 15,
            'current_page' => $page ?? 1,
            'last_page'    => (int) ceil($total / ($perPage ?? 15)),
        ]);
    }

    // ── SHOW ──────────────────────────────────────────────────────────────
    public function show($id)
    {
        $item = DB::table($this->table)->where('id', $id)->first();
        if (! $item) {
            return response()->json(['message' => 'Not found'], 404);
        }
        $item->tags     = json_decode($item->tags ?? '[]', true) ?? [];
        $item->sections = $this->getItemSections($id);
        $item->groups   = $this->getItemGroups($id);
        return response()->json($item);
    }

    // ── STORE ─────────────────────────────────────────────────────────────
    public function store(Request $request)
    {
        $request->validate([
            'title'  => 'required|string|max:255',
            'slug'   => 'required|string|max:255|unique:case_studies,slug',
            'status' => 'required|in:0,1',
        ]);

        $data               = $this->prepareData($request);
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table($this->table)->insertGetId($data);

        $this->saveSections($id, $request->input('sections', []));
        $this->saveGroups($id, $request->input('group_ids', []));

        return $this->freshResponse($id, 201);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────
    public function update(Request $request, $id)
    {
        if (! DB::table($this->table)->where('id', $id)->first()) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $request->validate([
            'title'  => 'required|string|max:255',
            'slug'   => "required|string|max:255|unique:case_studies,slug,{$id}",
            'status' => 'required|in:0,1',
        ]);

        $data               = $this->prepareData($request);
        $data['updated_at'] = now();

        DB::table($this->table)->where('id', $id)->update($data);

        $this->saveSections($id, $request->input('sections', []));
        $this->saveGroups($id, $request->input('group_ids', []));

        return $this->freshResponse($id);
    }

    // ── DESTROY ───────────────────────────────────────────────────────────
    public function destroy($id)
    {
        if (! DB::table($this->table)->where('id', $id)->first()) {
            return response()->json(['message' => 'Not found'], 404);
        }
        DB::table($this->sectionsTable)->where('case_study_id', $id)->delete();
        DB::table($this->groupPivot)->where('case_study_id', $id)->delete();
        DB::table($this->table)->where('id', $id)->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // ── UPLOAD MEDIA ──────────────────────────────────────────────────────
    public function uploadMedia(Request $request)
    {
        $request->validate(['file' => 'required|file|max:51200']);
        $path = $request->file('file')->store('case-studies', 'public');
        return response()->json(['url' => Storage::url($path)]);
    }

    // ── GROUPS INDEX ──────────────────────────────────────────────────────
    public function groupsIndex()
    {
        $groups = DB::table($this->groupsTable)
            ->orderBy('order')
            ->orderBy('name')
            ->get();
        return response()->json($groups);
    }

    // ── GROUPS STORE ──────────────────────────────────────────────────────
    public function groupsStore(Request $request)
    {
        $request->validate([
            'name'  => 'required|string|max:255',
            'color' => 'nullable|string|max:50',
        ]);

        $slug     = Str::slug($request->name);
        $baseSlug = $slug;
        $i        = 1;
        while (DB::table($this->groupsTable)->where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $i++;
        }

        $id = DB::table($this->groupsTable)->insertGetId([
            'name'        => $request->name,
            'slug'        => $slug,
            'description' => $request->input('description', ''),
            'color'       => $request->input('color', '#3b82f6'),
            'order'       => (int) $request->input('order', 0),
            'is_active'   => 1,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json(DB::table($this->groupsTable)->find($id), 201);
    }

    // ── GROUPS UPDATE ─────────────────────────────────────────────────────
    public function groupsUpdate(Request $request, $id)
    {
        $group = DB::table($this->groupsTable)->find($id);
        if (! $group) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $request->validate(['name' => 'required|string|max:255']);

        DB::table($this->groupsTable)->where('id', $id)->update([
            'name'        => $request->name,
            'description' => $request->input('description', $group->description),
            'color'       => $request->input('color', $group->color),
            'order'       => (int) $request->input('order', $group->order),
            'is_active'   => (int) $request->input('is_active', $group->is_active),
            'updated_at'  => now(),
        ]);

        return response()->json(DB::table($this->groupsTable)->find($id));
    }

    // ── GROUPS DESTROY ────────────────────────────────────────────────────
    public function groupsDestroy($id)
    {
        if (! DB::table($this->groupsTable)->find($id)) {
            return response()->json(['message' => 'Not found'], 404);
        }
        DB::table($this->groupPivot)->where('case_study_group_id', $id)->delete();
        DB::table($this->groupsTable)->where('id', $id)->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // ── ASSIGN GROUPS ─────────────────────────────────────────────────────
    public function assignGroups(Request $request, $id)
    {
        if (! DB::table($this->table)->find($id)) {
            return response()->json(['message' => 'Not found'], 404);
        }
        $this->saveGroups($id, $request->input('group_ids', []));
        return response()->json(['message' => 'Groups updated', 'groups' => $this->getItemGroups($id)]);
    }

    // ── PRIVATE HELPERS ───────────────────────────────────────────────────

    private function freshResponse($id, $status = 200)
    {
        $item           = DB::table($this->table)->find($id);
        $item->tags     = json_decode($item->tags ?? '[]', true) ?? [];
        $item->sections = $this->getItemSections($id);
        $item->groups   = $this->getItemGroups($id);
        return response()->json($item, $status);
    }

    private function getItemSections($caseStudyId): array
    {
        return DB::table($this->sectionsTable)
            ->where('case_study_id', $caseStudyId)
            ->orderBy('order')
            ->get()
            ->map(function ($s) {
                $s->content = is_string($s->content)
                    ? (json_decode($s->content, true) ?? [])
                    : ($s->content ?? []);
                return $s;
            })
            ->toArray();
    }

    private function getItemGroups($caseStudyId): array
    {
        return DB::table($this->groupsTable)
            ->join($this->groupPivot, $this->groupsTable . '.id', '=', $this->groupPivot . '.case_study_group_id')
            ->where($this->groupPivot . '.case_study_id', $caseStudyId)
            ->select($this->groupsTable . '.*', $this->groupPivot . '.order as pivot_order')
            ->orderBy($this->groupPivot . '.order')
            ->get()
            ->toArray();
    }

    private function saveSections($caseStudyId, $sections): void
    {
        if (! is_array($sections)) {
            $sections = json_decode($sections ?? '[]', true) ?? [];
        }

        // Delete sections not in incoming list
        $incomingIds = array_values(array_filter(array_column($sections, 'id')));
        $delQuery    = DB::table($this->sectionsTable)->where('case_study_id', $caseStudyId);
        if (! empty($incomingIds)) {
            $delQuery->whereNotIn('id', $incomingIds);
        }
        $delQuery->delete();

        foreach ($sections as $order => $section) {
            $contentRaw = $section['content'] ?? [];
            $content    = is_array($contentRaw) ? json_encode($contentRaw) : $contentRaw;

            $row = [
                'case_study_id' => $caseStudyId,
                'type'          => $section['type'] ?? 'text',
                'heading'       => $section['heading'] ?? '',
                'content'       => $content ?: '{}',
                'order'         => (int) ($section['order'] ?? $order),
                'is_active'     => isset($section['is_active']) ? (int) $section['is_active'] : 1,
                'updated_at'    => now(),
            ];

            if (! empty($section['id'])) {
                DB::table($this->sectionsTable)
                    ->where('id', $section['id'])
                    ->where('case_study_id', $caseStudyId)
                    ->update($row);
            } else {
                $row['created_at'] = now();
                DB::table($this->sectionsTable)->insert($row);
            }
        }
    }

    private function saveGroups($caseStudyId, $groupIds): void
    {
        if (! is_array($groupIds)) {
            $groupIds = json_decode($groupIds ?? '[]', true) ?? [];
        }

        DB::table($this->groupPivot)->where('case_study_id', $caseStudyId)->delete();

        foreach (array_values($groupIds) as $order => $groupId) {
            $groupId = (int) $groupId;
            if (! $groupId) continue;
            DB::table($this->groupPivot)->insert([
                'case_study_id'       => $caseStudyId,
                'case_study_group_id' => $groupId,
                'order'               => $order,
                'created_at'          => now(),
                'updated_at'          => now(),
            ]);
        }
    }

    private function prepareData(Request $request): array
    {
        $data = [
            'title'        => $request->title,
            'slug'         => $request->slug,
            'category'     => $request->input('category', ''),
            'description'  => $request->input('description', ''),
            'client_name'  => $request->input('client_name', ''),
            'project_link' => $request->input('project_link', ''),
            'status'       => (int) $request->status,
        ];

        // Tags — always store as JSON
        $raw  = $request->input('tags', []);
        $tags = is_array($raw) ? $raw : (json_decode($raw, true) ?? []);
        $data['tags'] = json_encode(array_values($tags));

        // Featured image: file upload takes priority, then URL
        if ($request->hasFile('featured_image')) {
            $path                   = $request->file('featured_image')->store('case-studies', 'public');
            $data['featured_image'] = Storage::url($path);
        } elseif ($request->filled('featured_image_url')) {
            $data['featured_image'] = $request->featured_image_url;
        }

        return $data;
    }
}
