<?php

namespace App\Models\DesignSystem;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DsPageBlock extends Model
{
    protected $table = 'ds_page_blocks';

    protected $fillable = [
        'section_id', 'column_index', 'block_type', 'label',
        'sort_order', 'content', 'style', 'is_visible',
    ];

    protected $casts = [
        'content'      => 'array',
        'style'        => 'array',
        'is_visible'   => 'boolean',
        'column_index' => 'integer',
        'sort_order'   => 'integer',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(DsPageSection::class, 'section_id');
    }

    /** Merge stored content over the type's defaults */
    public function getResolvedContentAttribute(): array
    {
        return array_merge(self::defaultsFor($this->block_type), $this->content ?? []);
    }

    /** Default content for each block type */
    public static function defaultsFor(string $type): array
    {
        return match ($type) {
            'heading' => [
                'text'  => 'Section Heading',
                'level' => 'h2',
                'align' => 'left',
            ],
            'paragraph' => [
                'text'  => 'Start writing your content here. Click to edit.',
                'align' => 'left',
            ],
            'image' => [
                'url'        => '',
                'alt'        => '',
                'caption'    => '',
                'link_url'   => '',
                'object_fit' => 'cover',
                'width'      => '100%',
                'height'     => 'auto',
                'rounded'    => false,
            ],
            'button' => [
                'label'        => 'Click Here',
                'url'          => '#',
                'variant'      => 'primary',
                'size'         => 'md',
                'align'        => 'left',
                'open_new_tab' => false,
                'icon'         => '',
            ],
            'spacer' => [
                'height' => 40,
            ],
            'divider' => [
                'line_style'    => 'solid',
                'color'         => '#e2e8f0',
                'thickness'     => 1,
                'width_percent' => 100,
                'align'         => 'center',
            ],
            'gallery' => [
                'images'   => [],
                'columns'  => 3,
                'gap'      => 12,
                'lightbox' => true,
                'rounded'  => false,
            ],
            'video' => [
                'url'          => '',
                'autoplay'     => false,
                'muted'        => true,
                'loop'         => false,
                'show_controls'=> true,
                'aspect_ratio' => '16:9',
            ],
            'html' => [
                'code' => '<p>Custom HTML content</p>',
            ],
            'quote' => [
                'text'             => 'A meaningful quote goes here.',
                'author'           => 'Author Name',
                'author_title'     => '',
                'author_image_url' => '',
                'align'            => 'center',
            ],
            'list' => [
                'items'      => [['text' => 'First item'], ['text' => 'Second item'], ['text' => 'Third item']],
                'list_style' => 'unordered', // unordered | ordered | checklist
                'icon'       => '',
            ],
            'icon' => [
                'name'     => 'Star',   // lucide icon name
                'size'     => 48,
                'color'    => '',
                'link_url' => '',
                'align'    => 'center',
            ],
            default => [],
        };
    }
}
