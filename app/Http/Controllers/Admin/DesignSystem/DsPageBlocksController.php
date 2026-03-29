<?php

namespace App\Http\Controllers\Admin\DesignSystem;

use App\Http\Controllers\Controller;
use App\Models\DesignSystem\DsPageBlock;
use App\Models\DesignSystem\DsPageSection;
use App\Models\DesignSystem\DsSite;
use App\Models\DesignSystem\DsSitePage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DsPageBlocksController extends Controller
{
    // ── GET blocks grouped by column_index ───────────────────────────

    public function index(DsSite $dsSite, DsSitePage $page, DsPageSection $section): JsonResponse
    {
        $this->authorize($dsSite, $page, $section);

        $blocks = $section->blocks()
            ->get()
            ->map(fn($b) => $this->fmt($b))
            ->groupBy('column_index');

        // Ensure all column slots exist in the response even if empty
        $layout  = $section->layout ?? '1col';
        $cols    = $this->columnCount($layout);
        $grouped = [];
        for ($i = 0; $i < $cols; $i++) {
            $grouped[(string) $i] = $blocks->get($i, collect())->values()->all();
        }

        return response()->json($grouped);
    }

    // ── POST create block ─────────────────────────────────────────────

    public function store(Request $request, DsSite $dsSite, DsSitePage $page, DsPageSection $section): JsonResponse
    {
        $this->authorize($dsSite, $page, $section);

        $data = $request->validate([
            'block_type'   => 'required|string|in:heading,paragraph,image,button,spacer,divider,gallery,video,html,quote,list,icon',
            'column_index' => 'nullable|integer|min:0',
            'label'        => 'nullable|string|max:100',
            'content'      => 'nullable|array',
            'style'        => 'nullable|array',
            'is_visible'   => 'boolean',
        ]);

        $colIdx         = $data['column_index'] ?? 0;
        $data['section_id']    = $section->id;
        $data['column_index']  = $colIdx;
        $data['sort_order']    = DsPageBlock::where('section_id', $section->id)
                                            ->where('column_index', $colIdx)
                                            ->max('sort_order') + 1;
        $data['content'] = array_merge(
            DsPageBlock::defaultsFor($data['block_type']),
            $data['content'] ?? []
        );

        $block = DsPageBlock::create($data);

        return response()->json($this->fmt($block), 201);
    }

    // ── PUT update block ──────────────────────────────────────────────

    public function update(Request $request, DsSite $dsSite, DsSitePage $page, DsPageSection $section, DsPageBlock $block): JsonResponse
    {
        $this->authorize($dsSite, $page, $section);
        abort_if($block->section_id !== $section->id, 404);

        $data = $request->validate([
            'label'        => 'nullable|string|max:100',
            'content'      => 'nullable|array',
            'style'        => 'nullable|array',
            'is_visible'   => 'boolean',
            'column_index' => 'nullable|integer|min:0',
            'sort_order'   => 'nullable|integer|min:0',
        ]);

        $block->update($data);

        return response()->json($this->fmt($block->fresh()));
    }

    // ── DELETE block ──────────────────────────────────────────────────

    public function destroy(DsSite $dsSite, DsSitePage $page, DsPageSection $section, DsPageBlock $block): JsonResponse
    {
        $this->authorize($dsSite, $page, $section);
        abort_if($block->section_id !== $section->id, 404);
        $block->delete();
        return response()->json(null, 204);
    }

    // ── POST reorder (cross-column drag-drop) ─────────────────────────
    // Body: { items: [{ id, column_index, sort_order }] }

    public function reorder(Request $request, DsSite $dsSite, DsSitePage $page, DsPageSection $section): JsonResponse
    {
        $this->authorize($dsSite, $page, $section);

        $validated = $request->validate([
            'items'                 => 'required|array',
            'items.*.id'            => 'required|integer',
            'items.*.column_index'  => 'required|integer|min:0',
            'items.*.sort_order'    => 'required|integer|min:0',
        ]);

        foreach ($validated['items'] as $item) {
            DsPageBlock::where('id', $item['id'])
                       ->where('section_id', $section->id)
                       ->update([
                           'column_index' => $item['column_index'],
                           'sort_order'   => $item['sort_order'],
                       ]);
        }

        return response()->json(['message' => 'Reordered.']);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private function authorize(DsSite $dsSite, DsSitePage $page, DsPageSection $section): void
    {
        abort_if($page->site_id  !== $dsSite->id,  404);
        abort_if($section->page_id !== $page->id, 404);
    }

    private function fmt(DsPageBlock $block): array
    {
        return [
            'id'           => $block->id,
            'section_id'   => $block->section_id,
            'column_index' => $block->column_index,
            'block_type'   => $block->block_type,
            'label'        => $block->label,
            'sort_order'   => $block->sort_order,
            'content'      => $block->resolved_content,
            'style'        => $block->style ?? [],
            'is_visible'   => $block->is_visible,
        ];
    }

    private function columnCount(string $layout): int
    {
        return match ($layout) {
            '2col', 'sidebar-left', 'sidebar-right' => 2,
            '3col'                                   => 3,
            '4col'                                   => 4,
            default                                  => 1,
        };
    }
}
