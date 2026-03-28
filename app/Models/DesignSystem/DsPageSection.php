<?php

namespace App\Models\DesignSystem;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DsPageSection extends Model
{
    protected $table = 'ds_page_sections';

    protected $fillable = [
        'page_id', 'section_type', 'label', 'sort_order', 'settings', 'is_visible',
    ];

    protected $casts = [
        'settings'   => 'array',
        'is_visible' => 'boolean',
    ];

    public function page(): BelongsTo
    {
        return $this->belongsTo(DsSitePage::class, 'page_id');
    }

    /** Merge stored settings over the type's defaults */
    public function getResolvedSettingsAttribute(): array
    {
        return array_merge(self::defaultsFor($this->section_type), $this->settings ?? []);
    }

    public static function defaultsFor(string $type): array
    {
        return match ($type) {
            'navbar' => [
                'logo_text' => 'Brand',
                'logo_url'  => '',
                'links'     => [['label' => 'Home', 'url' => '/'], ['label' => 'About', 'url' => '/about']],
                'cta_label' => 'Get Started',
                'cta_url'   => '#contact',
                'sticky'    => true,
                'bg_color'  => '',
            ],
            'hero' => [
                'title'          => 'Welcome to Our Site',
                'subtitle'       => 'Build something amazing today.',
                'bg_color'       => '',
                'bg_image_url'   => '',
                'cta_label'      => 'Get Started',
                'cta_url'        => '#contact',
                'cta2_label'     => 'Learn More',
                'cta2_url'       => '#features',
                'align'          => 'center',
            ],
            'carousel' => [
                'slides'       => [
                    ['title' => 'Slide One', 'subtitle' => 'Subtitle for slide one', 'bg_color' => '#405189', 'cta_label' => 'Learn More', 'cta_url' => '#'],
                    ['title' => 'Slide Two', 'subtitle' => 'Subtitle for slide two', 'bg_color' => '#0ab39c', 'cta_label' => 'Get Started', 'cta_url' => '#'],
                ],
                'autoplay'    => true,
                'interval'    => 5000,
                'show_dots'   => true,
                'show_arrows' => true,
            ],
            'cards' => [
                'title'    => 'Our Services',
                'subtitle' => 'What we offer',
                'columns'  => 3,
                'cards'    => [
                    ['title' => 'Service One',   'description' => 'Description for service one.',   'icon' => 'ri-star-line',   'link_label' => 'Learn More', 'link_url' => '#'],
                    ['title' => 'Service Two',   'description' => 'Description for service two.',   'icon' => 'ri-check-line',  'link_label' => 'Learn More', 'link_url' => '#'],
                    ['title' => 'Service Three', 'description' => 'Description for service three.', 'icon' => 'ri-heart-line',  'link_label' => 'Learn More', 'link_url' => '#'],
                ],
            ],
            'features' => [
                'title'    => 'Why Choose Us',
                'subtitle' => '',
                'items'    => [
                    ['icon' => 'ri-check-double-line',       'title' => 'Fast & Reliable',  'description' => 'Lightning fast performance you can count on.'],
                    ['icon' => 'ri-shield-check-line',       'title' => 'Secure by Default','description' => 'Enterprise-grade security out of the box.'],
                    ['icon' => 'ri-customer-service-2-line', 'title' => '24/7 Support',     'description' => 'Round the clock support for your needs.'],
                ],
            ],
            'testimonials' => [
                'title' => 'What Our Customers Say',
                'items' => [
                    ['name' => 'John Smith', 'role' => 'CEO, Acme Inc.',        'text' => 'This product has transformed how we work!',          'rating' => 5],
                    ['name' => 'Jane Doe',   'role' => 'Marketing Director',    'text' => 'Absolutely love the design and functionality.',        'rating' => 5],
                ],
            ],
            'cta' => [
                'title'        => 'Ready to Get Started?',
                'subtitle'     => 'Join thousands of happy customers today.',
                'button_label' => 'Start Free Trial',
                'button_url'   => '/signup',
                'bg_color'     => '',
                'align'        => 'center',
            ],
            'footer' => [
                'logo_text' => 'Brand',
                'tagline'   => 'Building great things since 2024.',
                'copyright' => '© 2024 Brand. All rights reserved.',
                'columns'   => [
                    ['title' => 'Company', 'links' => [['label' => 'About', 'url' => '/about'], ['label' => 'Careers', 'url' => '/careers']]],
                    ['title' => 'Product', 'links' => [['label' => 'Features', 'url' => '/features'], ['label' => 'Pricing', 'url' => '/pricing']]],
                ],
                'social' => [
                    ['platform' => 'twitter',   'url' => ''],
                    ['platform' => 'facebook',  'url' => ''],
                    ['platform' => 'instagram', 'url' => ''],
                ],
            ],
            default => [],
        };
    }
}
