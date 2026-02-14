<?php

namespace App\Http\Controllers\PublicApi;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CaseStudyController extends Controller
{
    /**
     * GET /api/case-studies
     *
     * Paginated list of active case studies, similar to the old CMS.
     */
    public function index(Request $request)
    {
        // Primary table for case studies
        $table = 'case_studies';
        // Prefer plural groups table, but fall back to singular if needed
        $groupsTable = Schema::hasTable('case_study_groups') ? 'case_study_groups' : 'case_study_group';

        if (! Schema::hasTable($table)) {
            return response()->json([
                'message' => "Table [{$table}] does not exist. Please ensure your imported table name is '{$table}'.",
            ], 500);
        }

        // Base query from main table
        $query = DB::table($table);

        $selects = [];

        // Core case_studies columns (only add if they actually exist). Group fields will be populated
        // from the pivot + groups table later so we don't rely on a direct FK.
        $candidateColumns = [
            'id',
            'title',
            'slug',
            'category',
            'featured_image',
            'project_link',
            'client_name',
            'description',
            'tags',
            'status',
            'group_name',
            'group_description',
            'created_at',
            'updated_at',
        ];

        foreach ($candidateColumns as $col) {
            // group_name / group_description may come from a related table; handle below
            if (in_array($col, ['group_name', 'group_description'], true)) {
                continue;
            }

            if (Schema::hasColumn($table, $col)) {
                $selects[] = $table . '.' . $col;
            }
        }

        // If group_* are denormalized columns directly on case_studies, include them directly
        foreach (['group_name', 'group_description'] as $col) {
            if (Schema::hasColumn($table, $col)) {
                $selects[] = $table . '.' . $col;
            }
        }

        if (! empty($selects)) {
            $query->select($selects);
        }

        // Optional "active" flag: keep logic lenient so we don't accidentally hide rows.
        if (Schema::hasColumn($table, 'is_active')) {
            $query->where($table . '.is_active', 1);
        }

        // Optional search by title/category/client
        $search = $request->string('search')->toString();
        if ($search !== '') {
            $query->where(function ($q) use ($search, $table) {
                foreach (['title', 'category', 'client_name'] as $col) {
                    if (Schema::hasColumn($table, $col)) {
                        $q->orWhere($col, 'like', '%' . $search . '%');
                    }
                }
            });
        }

        // If you need pagination later, you can swap get() with paginate().
        $items = $query->get();

        // Map of case_study_id => first group (by pivot order) using the real pivot table
        $groupMap = [];
        if (
            Schema::hasTable($groupsTable)
            && Schema::hasTable('case_study_group')
            && Schema::hasColumn('case_study_group', 'case_study_id')
            && Schema::hasColumn('case_study_group', 'case_study_group_id')
        ) {
            $groupRows = DB::table('case_study_group')
                ->join($groupsTable, $groupsTable . '.id', '=', 'case_study_group.case_study_group_id')
                ->select(
                    'case_study_group.case_study_id',
                    $groupsTable . '.name as group_name',
                    $groupsTable . '.description as group_description',
                    DB::raw('COALESCE(case_study_group.`order`, 0) as pivot_order')
                )
                ->orderBy('pivot_order')
                ->get();

            foreach ($groupRows as $row) {
                // Only keep the first group per case study (primary group) for this public API
                if (! isset($groupMap[$row->case_study_id])) {
                    $groupMap[$row->case_study_id] = $row;
                }
            }
        }

        // Normalise shape to match legacy API:
        // - decode tags JSON
        // - ensure featured_image_url is present
        // - cast status to boolean
        // - attach group_name / group_description from groups pivot if available
        $items->transform(function ($item) use ($groupMap) {
            if (property_exists($item, 'tags') && is_string($item->tags)) {
                $decoded = json_decode($item->tags, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $item->tags = $decoded;
                }
            }

            if (property_exists($item, 'featured_image') && ! property_exists($item, 'featured_image_url')) {
                $item->featured_image_url = $item->featured_image;
            }

            if (property_exists($item, 'status')) {
                $item->status = (bool) $item->status;
            }

            if (isset($groupMap[$item->id])) {
                $group = $groupMap[$item->id];
                $item->group_name = $group->group_name ?? null;
                $item->group_description = $group->group_description ?? null;
            } elseif (! property_exists($item, 'group_name')) {
                // Ensure fields exist in response even if null
                $item->group_name = null;
                $item->group_description = $item->group_description ?? null;
            }

            return $item;
        });

        // Return a flat array of case studies (no paginator wrapper)
        return response()->json($items->values());
    }

    /**
     * GET /api/case-studies/{slug}
     *
     * Single case study detail + its dynamic sections.
     * Assumes a related table like "case_study_sections" with a case_study_id FK.
     */
    public function show(string $slug)
    {
        $table = 'case_studies';
        $groupsTable = Schema::hasTable('case_study_groups') ? 'case_study_groups' : 'case_study_group';

        if (! Schema::hasTable($table)) {
            return response()->json([
                'message' => "Table [{$table}] does not exist. Please ensure your imported table name is '{$table}'.",
            ], 500);
        }

        // Base query for single case study (with optional group join)
        $query = DB::table($table);

        $selects = [$table . '.*'];

        if (
            Schema::hasTable($groupsTable)
            && Schema::hasColumn($table, 'group_id')
            && Schema::hasColumn($groupsTable, 'id')
        ) {
            $query->leftJoin($groupsTable, $groupsTable . '.id', '=', $table . '.group_id');

            if (Schema::hasColumn($groupsTable, 'name')) {
                $selects[] = $groupsTable . '.name as group_name';
            }
            if (Schema::hasColumn($groupsTable, 'description')) {
                $selects[] = $groupsTable . '.description as group_description';
            }
        }

        $caseStudy = $query
            ->select($selects)
            ->where($table . '.slug', $slug)
            ->first();

        if (! $caseStudy) {
            return response()->json(['message' => 'Case study not found.'], 404);
        }

        // Attach dynamic sections if a sections table exists
        $sectionsTable = 'case_study_sections';
        $sections = [];

        if (Schema::hasTable($sectionsTable)) {
            $sectionsQuery = DB::table($sectionsTable);

            if (Schema::hasColumn($sectionsTable, 'case_study_id')) {
                $sectionsQuery->where('case_study_id', $caseStudy->id);
            }

            if (Schema::hasColumn($sectionsTable, 'sort_order')) {
                $sectionsQuery->orderBy('sort_order');
            }

            $sections = $sectionsQuery->get()->map(function ($row) {
                // If there's a JSON "content" column, decode it
                if (property_exists($row, 'content') && is_string($row->content)) {
                    $decoded = json_decode($row->content, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $row->content = $decoded;
                    }
                }

                return $row;
            })->values()->all();
        }

        // Convert stdClass to array and attach sections, matching old API style
        $data = (array) $caseStudy;
        // Decode tags JSON for detail endpoint as well
        if (array_key_exists('tags', $data) && is_string($data['tags'])) {
            $decoded = json_decode($data['tags'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $data['tags'] = $decoded;
            }
        }
        $data['sections'] = $sections;

        return response()->json(['data' => $data]);
    }
}

