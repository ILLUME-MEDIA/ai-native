<?php

namespace Database\Seeders;

use App\Models\DesignSystem\DsPageBlock;
use App\Models\DesignSystem\DsPageSection;
use App\Models\DesignSystem\DsSite;
use App\Models\DesignSystem\DsSitePage;
use Illuminate\Database\Seeder;

/**
 * Caterbox Home Page Seeder
 *
 * Builds the full food-delivery homepage using ONLY structured block types —
 * no raw HTML. Every field is editable from the admin design system UI.
 * The frontend PageRenderer (resources/js/Frontend/PageRenderer.jsx) renders
 * these blocks using typed React components.
 *
 * Run: php artisan db:seed --class=CaterboxHomePageSeeder
 */
class CaterboxHomePageSeeder extends Seeder
{
    public function run(): void
    {
        // ── Find or create the Caterbox site ───────────────────────
        $site = DsSite::firstOrCreate(
            ['slug' => 'caterbox'],
            [
                'name'        => 'Caterbox',
                'description' => 'Food delivery & restaurant discovery platform',
                'is_active'   => true,
            ]
        );

        // ── Delete existing Home page (idempotent re-seed) ──────────
        $site->pages()->where('slug', 'home')->delete();

        // ── Create the Home page ────────────────────────────────────
        $page = DsSitePage::create([
            'site_id'    => $site->id,
            'name'       => 'Home',
            'slug'       => 'home',
            'title'      => 'Caterbox – Order Delivery Near You',
            'is_active'  => true,
            'sort_order' => 1,
        ]);

        $sort = 0;

        // ═══════════════════════════════════════════════════════════
        // 1. HERO BANNER
        // ═══════════════════════════════════════════════════════════
        $hero = $this->section($page->id, '1col', 'Hero Banner', $sort++, [
            'bg_image'   => 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80',
            'bg_color'   => 'rgba(0,0,0,0.52)',
            'text_color' => '#ffffff',
            'padding_y'  => '80',
            'max_width'  => '960px',
        ]);

        // hero_banner block — all content editable from admin
        $this->block($hero->id, 0, 0, 'hero_banner', 'Hero', [
            'promo_tag'  => 'Save up to 50% off on your first order',
            'headline'   => 'Order Delivery Near You',
            'subtext'    => '',
            'bg_image'   => '',        // section already sets bg_image
            'bg_overlay' => '',        // section overlay handles it
            'text_align' => 'left',
            'buttons'    => [
                ['label' => 'Explore Shop', 'url' => '/shop',    'icon' => '🏪', 'style' => 'outline'],
                ['label' => 'Get Started',  'url' => '/start',   'icon' => '→',  'style' => 'outline'],
                ['label' => 'Order Now',    'url' => '/order',   'icon' => '📦', 'style' => 'outline'],
                ['label' => 'Profile',      'url' => '/profile', 'icon' => '👤', 'style' => 'outline'],
            ],
        ]);

        // search_bar block below the heading
        $this->block($hero->id, 0, 1, 'search_bar', 'Search Bar', [
            'placeholder_restaurant' => 'Search restaurants...',
            'placeholder_location'   => 'City, State',
            'button_text'            => 'Search',
            'button_bg'              => '#1e293b',
            'show_location'          => true,
        ]);

        // ═══════════════════════════════════════════════════════════
        // 2. CUISINE FILTER TABS
        // ═══════════════════════════════════════════════════════════
        $filter = $this->section($page->id, '1col', 'Cuisine Filter', $sort++, [
            'bg_color'  => '#ffffff',
            'padding_y' => '16',
            'max_width' => '1200px',
        ]);

        $this->block($filter->id, 0, 0, 'cuisine_tabs', 'Cuisine Tabs', [
            'active_id'  => 'all',
            'categories' => [
                ['id' => 'all',            'label' => 'All',            'count' => null,  'emoji' => ''],
                ['id' => 'afghan',         'label' => 'Afghan',         'count' => '666', 'emoji' => ''],
                ['id' => 'african',        'label' => 'African',        'count' => '40',  'emoji' => ''],
                ['id' => 'afro-caribbean', 'label' => 'Afro-Caribbean', 'count' => '0',   'emoji' => ''],
                ['id' => 'albanian',       'label' => 'Albanian',       'count' => '11',  'emoji' => ''],
                ['id' => 'algerian',       'label' => 'Algerian',       'count' => '51',  'emoji' => ''],
                ['id' => 'american',       'label' => 'American',       'count' => '5.6k','emoji' => ''],
                ['id' => 'chinese',        'label' => 'Chinese',        'count' => '2.1k','emoji' => ''],
                ['id' => 'indian',         'label' => 'Indian',         'count' => '1.8k','emoji' => ''],
                ['id' => 'italian',        'label' => 'Italian',        'count' => '890', 'emoji' => ''],
                ['id' => 'mexican',        'label' => 'Mexican',        'count' => '430', 'emoji' => ''],
            ],
        ]);

        // ═══════════════════════════════════════════════════════════
        // 3. RESTAURANT LISTINGS (3-column grid)
        // ═══════════════════════════════════════════════════════════
        $listings = $this->section($page->id, '3col', 'Restaurant Listings', $sort++, [
            'bg_color'  => '#f8fafc',
            'padding_y' => '32',
            'max_width' => '1200px',
        ]);

        $restaurants = [
            // [col, sort, name, address, tags, rating, reviews, photos, image_url, badge]
            [0, 0, '#1 Pizza & Fish \'N Chips', '2309 San Pablo Ave, Berkeley, CA 94702',         ['American'],               4.0, 0,   0, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=60', ''],
            [1, 0, '#fries',                     '190 Fox Valley Center Rd, Gainesville, FL 32601', ['Belgian', 'American'],   2.0, 1,   0, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200&q=60', ''],
            [2, 0, '$5 Pizza',                   '4633 Central Ave NE, Minneapolis, MN 55421',     ['Italian'],                3.5, 2,   0, '', ''],
            [0, 1, '(Ai-Jia) Qingzhen Beef Noodle', '41 Alley 223, Zhongxiao East Rd, Taipei',   ['Chinese'],                4.5, 8,   0, '', ''],
            [1, 1, '(Sun Center) Kabob House',   '101 SE 2nd Place, Gainesville, FL 32601',        ['Indian', 'Pakistani'],   4.0, 2,   0, '', ''],
            [2, 1, 'Jerusalem Restaurant',        '2620 Vineland Rd, Kissimmee, FL 34748',          ['Middle Eastern'],         4.0, 421, 0, 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=200&q=60', 'Popular'],
            [0, 2, '1 for 1 Pizza (Ottawa West)', '2900 Woodroffe Ave, Ottawa, ON, K2J',           ['Italian'],                3.5, 2,   0, '', ''],
            [1, 2, '1 for 1 Pizza (Carling)',     '2525 Carling Ave, Ottawa, ON, K2B 7Z2',         ['Italian', 'American'],   3.5, 1,   0, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=60', ''],
            [2, 2, '1 for 1 Pizza (Laurent)',     '1741 St-Laurent Blvd, Ottawa, ON',               ['Italian'],                2.5, 1,   0, '', ''],
        ];

        foreach ($restaurants as [$col, $sortIdx, $name, $addr, $tags, $rating, $reviews, $photos, $img, $badge]) {
            $this->block($listings->id, $col, $sortIdx, 'restaurant_card', $name, [
                'name'         => $name,
                'address'      => $addr,
                'tags'         => $tags,
                'rating'       => $rating,
                'review_count' => $reviews,
                'photo_count'  => $photos,
                'image_url'    => $img,
                'badge'        => $badge,
            ]);
        }

        // ═══════════════════════════════════════════════════════════
        // 4. CTA SUBSCRIBE BANNER
        // ═══════════════════════════════════════════════════════════
        $cta = $this->section($page->id, '1col', 'Subscribe Banner', $sort++, [
            'bg_image'   => 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1400&q=70',
            'bg_color'   => 'rgba(15,23,42,0.80)',
            'text_color' => '#ffffff',
            'padding_y'  => '60',
            'max_width'  => '640px',
        ]);

        // heading block
        $this->block($cta->id, 0, 0, 'heading', 'CTA Heading', [
            'text'  => 'Stay home & get your daily needs from our shop',
            'level' => 'h2',
            'align' => 'left',
        ], ['fontSize' => '32px', 'fontWeight' => '700', 'marginBottom' => '24px']);

        // email_subscribe block
        $this->block($cta->id, 0, 1, 'email_subscribe', 'Email Subscribe', [
            'placeholder' => 'Enter your mail',
            'button_text' => 'Subscribe now',
            'disclaimer'  => 'I agree that my submitted data is being collected and stored.',
            'button_bg'   => '#f59e0b',
        ]);

        // ═══════════════════════════════════════════════════════════
        // 5. DEALS & OFFERS (2-column)
        // ═══════════════════════════════════════════════════════════
        $deals = $this->section($page->id, '2col', 'Deals & Offers', $sort++, [
            'bg_color'  => '#f8fafc',
            'padding_y' => '40',
            'max_width' => '1200px',
        ]);

        $dealData = [
            [0, 0, '$5 off your first order', 'Delivery by 6:15am', 'expired Aug 5', '', 'Shop Now', '#', '#0f172a'],
            [1, 0, '$5 off your first order', 'Delivery by 6:15am', 'expired Aug 5', '', 'Shop Now', '#', '#0f172a'],
            [0, 1, '$5 off your first order', 'Delivery by 6:15am', 'expired Aug 5', '', 'Shop Now', '#', '#0f172a'],
            [1, 1, '$5 off your first order', 'Delivery by 6:15am', 'expired Aug 5', '', 'Shop Now', '#', '#0f172a'],
        ];

        foreach ($dealData as [$col, $sortIdx, $title, $delivery, $expiry, $img, $cta_text, $cta_url, $cta_bg]) {
            $this->block($deals->id, $col, $sortIdx, 'deal_card', $title, [
                'title'         => $title,
                'delivery_info' => $delivery,
                'expiry'        => $expiry,
                'image_url'     => $img,
                'cta_text'      => $cta_text,
                'cta_url'       => $cta_url,
                'cta_bg'        => $cta_bg,
            ]);
        }

        // ═══════════════════════════════════════════════════════════
        // 6. FOOTER (3-column)
        // ═══════════════════════════════════════════════════════════
        $footer = $this->section($page->id, '3col', 'Footer', $sort++, [
            'bg_color'   => '#0f172a',
            'text_color' => '#94a3b8',
            'padding_y'  => '24',
            'max_width'  => '1200px',
        ]);

        $this->block($footer->id, 0, 0, 'paragraph', 'Copyright', [
            'text'  => 'Marketpro eCommerce © 2024. All Rights Reserved',
            'align' => 'left',
        ], ['color' => '#94a3b8', 'fontSize' => '12px']);

        // Footer links list
        $this->block($footer->id, 1, 0, 'list', 'Footer Links', [
            'items'      => [
                ['text' => 'About Us'],
                ['text' => 'Contact'],
                ['text' => 'Privacy Policy'],
                ['text' => 'Terms of Service'],
            ],
            'list_style' => 'unordered',
        ], ['color' => '#94a3b8', 'fontSize' => '13px']);

        $this->block($footer->id, 2, 0, 'paragraph', 'Accepting Payments', [
            'text'  => 'We Are Accepting: VISA · MC · PayPal',
            'align' => 'right',
        ], ['color' => '#94a3b8', 'fontSize' => '12px']);

        $this->command->info("✅  Caterbox Home page seeded: {$sort} sections, " . DsPageBlock::where('section_id', '>', 0)->count() . ' total blocks.');
        $this->command->info('    Frontend: <PageRenderer siteSlug="caterbox" pageSlug="home" />');
        $this->command->info('    API:      GET /api/ds/caterbox/page/home');
    }

    // ── Helpers ────────────────────────────────────────────────────

    private function section(int $pageId, string $layout, string $label, int $sort, array $settings = []): DsPageSection
    {
        return DsPageSection::create([
            'page_id'      => $pageId,
            'section_type' => 'layout',
            'layout'       => $layout,
            'label'        => $label,
            'sort_order'   => $sort,
            'is_visible'   => true,
            'settings'     => $settings,
        ]);
    }

    private function block(int $sectionId, int $col, int $order, string $type, string $label, array $content, array $style = []): DsPageBlock
    {
        return DsPageBlock::create([
            'section_id'   => $sectionId,
            'column_index' => $col,
            'block_type'   => $type,
            'label'        => $label,
            'sort_order'   => $order,
            'content'      => $content,
            'style'        => $style,
            'is_visible'   => true,
        ]);
    }
}
