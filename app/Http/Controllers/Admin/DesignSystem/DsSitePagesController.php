<?php

namespace App\Http\Controllers\Admin\DesignSystem;

use App\Http\Controllers\Controller;
use App\Models\DesignSystem\DsPageSection;
use App\Models\DesignSystem\DsSite;
use App\Models\DesignSystem\DsSitePage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DsSitePagesController extends Controller
{
    // ── Pages ─────────────────────────────────────────────────────────────────

    public function index(DsSite $dsSite): JsonResponse
    {
        $pages = $dsSite->pages()
            ->withCount('sections')
            ->with('theme:id,name,slug')
            ->get()
            ->map(fn($p) => $this->formatPage($p));

        return response()->json($pages);
    }

    public function store(Request $request, DsSite $dsSite): JsonResponse
    {
        $data = $request->validate([
            'name'             => 'required|string|max:100',
            'slug'             => 'nullable|string|max:80|regex:/^[a-z0-9-]+$/',
            'title'            => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'sort_order'       => 'nullable|integer|min:0',
            'theme_id'         => 'nullable|exists:ds_themes,id',
            'is_active'        => 'boolean',
        ]);

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        // Ensure slug is unique within this site
        $base  = $data['slug'];
        $slug  = $base;
        $i     = 1;
        while (DsSitePage::where('site_id', $dsSite->id)->where('slug', $slug)->exists()) {
            $slug = "{$base}-" . $i++;
        }
        $data['slug']       = $slug;
        $data['site_id']    = $dsSite->id;
        $data['sort_order'] = $data['sort_order'] ?? DsSitePage::where('site_id', $dsSite->id)->max('sort_order') + 1;

        $page = DsSitePage::create($data);

        return response()->json($this->formatPage($page->load('theme')), 201);
    }

    public function update(Request $request, DsSite $dsSite, DsSitePage $page): JsonResponse
    {
        abort_if($page->site_id !== $dsSite->id, 404);

        $data = $request->validate([
            'name'             => 'sometimes|string|max:100',
            'slug'             => 'sometimes|string|max:80|regex:/^[a-z0-9-]+$/',
            'title'            => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'sort_order'       => 'nullable|integer|min:0',
            'theme_id'         => 'nullable|exists:ds_themes,id',
            'is_active'        => 'boolean',
        ]);

        // Unique slug check (excluding self)
        if (!empty($data['slug'])) {
            $exists = DsSitePage::where('site_id', $dsSite->id)
                ->where('slug', $data['slug'])
                ->where('id', '!=', $page->id)
                ->exists();
            if ($exists) {
                return response()->json(['message' => 'Slug already used on this site.'], 422);
            }
        }

        $page->update($data);

        return response()->json($this->formatPage($page->fresh('theme')));
    }

    public function destroy(DsSite $dsSite, DsSitePage $page): JsonResponse
    {
        abort_if($page->site_id !== $dsSite->id, 404);
        $page->delete();
        return response()->json(['message' => 'Page deleted.']);
    }

    /** Reorder pages: body = [{ id, sort_order }] */
    public function reorder(Request $request, DsSite $dsSite): JsonResponse
    {
        $items = $request->validate(['items' => 'required|array', 'items.*.id' => 'required|integer', 'items.*.sort_order' => 'required|integer']);
        foreach ($items['items'] as $item) {
            DsSitePage::where('id', $item['id'])->where('site_id', $dsSite->id)->update(['sort_order' => $item['sort_order']]);
        }
        return response()->json(['message' => 'Reordered.']);
    }

    // ── Sections ──────────────────────────────────────────────────────────────

    public function sections(DsSite $dsSite, DsSitePage $page): JsonResponse
    {
        abort_if($page->site_id !== $dsSite->id, 404);
        $sections = $page->sections()->get()->map(fn($s) => $this->formatSection($s));
        return response()->json($sections);
    }

    public function addSection(Request $request, DsSite $dsSite, DsSitePage $page): JsonResponse
    {
        abort_if($page->site_id !== $dsSite->id, 404);

        $data = $request->validate([
            'section_type' => 'nullable|string|max:50',
            'layout'       => 'nullable|string|in:1col,2col,3col,4col,sidebar-left,sidebar-right',
            'label'        => 'nullable|string|max:100',
            'settings'     => 'nullable|array',
            'sort_order'   => 'nullable|integer|min:0',
            'is_visible'   => 'boolean',
        ]);

        $data['page_id']    = $page->id;
        $data['section_type'] = $data['section_type'] ?? 'layout';
        $data['layout']     = $data['layout'] ?? '1col';
        $data['sort_order'] = $data['sort_order'] ?? DsPageSection::where('page_id', $page->id)->max('sort_order') + 1;

        // Merge incoming settings over defaults (only for known legacy types)
        $defaults = DsPageSection::defaultsFor($data['section_type']);
        $data['settings'] = array_merge($defaults, $data['settings'] ?? []);

        $section = DsPageSection::create($data);

        return response()->json($this->formatSection($section), 201);
    }

    public function updateSection(Request $request, DsSite $dsSite, DsSitePage $page, DsPageSection $section): JsonResponse
    {
        abort_if($page->site_id !== $dsSite->id, 404);
        abort_if($section->page_id !== $page->id, 404);

        $data = $request->validate([
            'label'      => 'nullable|string|max:100',
            'layout'     => 'nullable|string|in:1col,2col,3col,4col,sidebar-left,sidebar-right',
            'settings'   => 'nullable|array',
            'is_visible' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $section->update($data);

        return response()->json($this->formatSection($section->fresh()));
    }

    public function deleteSection(DsSite $dsSite, DsSitePage $page, DsPageSection $section): JsonResponse
    {
        abort_if($page->site_id !== $dsSite->id, 404);
        abort_if($section->page_id !== $page->id, 404);
        $section->delete();
        return response()->json(['message' => 'Section deleted.']);
    }

    /** Reorder sections: body = [{ id, sort_order }] */
    public function reorderSections(Request $request, DsSite $dsSite, DsSitePage $page): JsonResponse
    {
        abort_if($page->site_id !== $dsSite->id, 404);
        $items = $request->validate(['items' => 'required|array', 'items.*.id' => 'required|integer', 'items.*.sort_order' => 'required|integer']);
        foreach ($items['items'] as $item) {
            DsPageSection::where('id', $item['id'])->where('page_id', $page->id)->update(['sort_order' => $item['sort_order']]);
        }
        return response()->json(['message' => 'Reordered.']);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function formatPage(DsSitePage $page): array
    {
        return [
            'id'               => $page->id,
            'site_id'          => $page->site_id,
            'name'             => $page->name,
            'slug'             => $page->slug,
            'title'            => $page->title,
            'meta_description' => $page->meta_description,
            'sort_order'       => $page->sort_order,
            'theme_id'         => $page->theme_id,
            'theme'            => $page->relationLoaded('theme') ? $page->theme : null,
            'is_active'        => $page->is_active,
            'sections_count'   => $page->sections_count ?? 0,
            'created_at'       => $page->created_at,
        ];
    }

    private function formatSection(DsPageSection $section): array
    {
        return [
            'id'           => $section->id,
            'page_id'      => $section->page_id,
            'section_type' => $section->section_type,
            'layout'       => $section->layout ?? '1col',
            'label'        => $section->label,
            'sort_order'   => $section->sort_order,
            'settings'     => $section->resolved_settings,
            'is_visible'   => $section->is_visible,
            'created_at'   => $section->created_at,
        ];
    }
}
