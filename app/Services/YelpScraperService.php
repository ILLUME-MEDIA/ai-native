<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

/**
 * Scrapes Yelp web pages for data not available via the Fusion API.
 *   - /biz/{alias}    → full business detail page
 *   - /menu/{alias}   → full menu with categories, items, modifiers
 */
class YelpScraperService
{
    protected Client $client;

    public function __construct(?Client $client = null)
    {
        $this->client = $client ?? new Client([
            'timeout' => 30,
            'allow_redirects' => true,
            'headers' => [
                'User-Agent'      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept'          => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language' => 'en-US,en;q=0.9',
            ],
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Public API
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Scrape the /menu/{alias} page and return normalized menu items.
     * Each item has: yelp_menu_item_id, name, category, description, price,
     *                currency, image, is_available, sort_order, source_type,
     *                modifiers_json, raw_payload
     */
    public function scrapeMenu(string $alias): array
    {
        $html = $this->fetchHtml("https://www.yelp.com/menu/{$alias}");
        if (!$html) {
            return [];
        }

        return $this->parseMenuHtml($html);
    }

    /**
     * Scrape the /biz/{alias} page for any extra data.
     * Returns raw extracted arrays (amenities, hours, etc.).
     */
    public function scrapeBizExtras(string $alias): array
    {
        $html = $this->fetchHtml("https://www.yelp.com/biz/{$alias}");
        if (!$html) {
            return [];
        }

        $data = $this->extractEmbeddedJson($html);
        return $data ? ['page_data' => $data] : [];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // HTML fetch
    // ──────────────────────────────────────────────────────────────────────────

    protected function fetchHtml(string $url): ?string
    {
        try {
            return (string) $this->client->get($url)->getBody();
        } catch (RequestException $e) {
            return null;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Menu parsing
    // ──────────────────────────────────────────────────────────────────────────

    protected function parseMenuHtml(string $html): array
    {
        // 1. __NEXT_DATA__ (Next.js / newer Yelp)
        if (preg_match('/<script[^>]+id=["\']__NEXT_DATA__["\'][^>]*>([\s\S]*?)<\/script>/i', $html, $m)) {
            $data = json_decode($m[1], true);
            if ($data) {
                $items = $this->extractMenuFromNextData($data);
                if (!empty($items)) {
                    return $items;
                }
            }
        }

        // 2. application/json script tags (older Yelp embed)
        preg_match_all('/<script[^>]+type=["\']application\/json["\'][^>]*>([\s\S]*?)<\/script>/i', $html, $all);
        foreach ($all[1] ?? [] as $json) {
            $data = json_decode($json, true);
            if (is_array($data)) {
                $items = $this->deepFindSections($data);
                if (!empty($items)) {
                    return $items;
                }
            }
        }

        // 3. Inline JS state objects
        $patterns = [
            '/window\.__YELP_MENU_DATA__\s*=\s*([\s\S]*?);\s*<\/script>/i',
            '/window\.__PRELOADED_STATE__\s*=\s*([\s\S]*?);\s*<\/script>/i',
            '/"menu"\s*:\s*(\{[\s\S]*?"sections"\s*:\s*\[[\s\S]*?\]\s*\})/i',
        ];
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $html, $m)) {
                $data = json_decode($m[1], true);
                if (is_array($data)) {
                    $items = $this->deepFindSections($data);
                    if (!empty($items)) {
                        return $items;
                    }
                }
            }
        }

        return [];
    }

    protected function extractMenuFromNextData(array $data): array
    {
        // Try known Next.js pageProps paths
        $candidates = [
            $data['props']['pageProps']['businessData']['pageProperties']['menu'] ?? null,
            $data['props']['pageProps']['menu'] ?? null,
            $data['props']['pageProps']['menuPageProps']['menu'] ?? null,
            $data['props']['pageProps']['menuData'] ?? null,
            $data['props']['initialProps']['menu'] ?? null,
        ];

        foreach ($candidates as $node) {
            if (is_array($node)) {
                $items = $this->deepFindSections($node);
                if (!empty($items)) {
                    return $items;
                }
            }
        }

        // Broad deep search
        return $this->deepFindSections($data);
    }

    /**
     * Recursively search for a 'sections' array that looks like menu sections.
     */
    protected function deepFindSections(mixed $node, int $depth = 0): array
    {
        if ($depth > 12 || !is_array($node)) {
            return [];
        }

        // Does this node have 'sections' that look like menu sections?
        if (isset($node['sections']) && is_array($node['sections']) && !empty($node['sections'])) {
            $first = $node['sections'][0] ?? null;
            if ($first && (isset($first['items']) || isset($first['menu_items']) || isset($first['title']) || isset($first['name']))) {
                $parsed = $this->parseSections($node['sections']);
                if (!empty($parsed)) {
                    return $parsed;
                }
            }
        }

        foreach ($node as $value) {
            if (is_array($value)) {
                $result = $this->deepFindSections($value, $depth + 1);
                if (!empty($result)) {
                    return $result;
                }
            }
        }

        return [];
    }

    protected function parseSections(array $sections): array
    {
        $items = [];
        $sort  = 0;

        foreach ($sections as $section) {
            $category    = trim((string) ($section['title'] ?? $section['name'] ?? 'General'));
            $sectionItems = $section['items'] ?? $section['menu_items'] ?? [];

            foreach ($sectionItems as $item) {
                $modifiers = $this->extractModifiers($item);

                $items[] = [
                    'yelp_menu_item_id' => $item['id'] ?? $item['menu_item_id'] ?? null,
                    'name'              => trim((string) ($item['title'] ?? $item['name'] ?? 'Untitled')),
                    'category'          => $category,
                    'description'       => $item['description'] ?? null,
                    'price'             => $this->extractPrice($item),
                    'currency'          => 'USD',
                    'image'             => $item['photo']['mediaUrl']
                                          ?? $item['photo']['url']
                                          ?? $item['image_url']
                                          ?? $item['photo_url']
                                          ?? null,
                    'is_available'      => !($item['is_unavailable'] ?? $item['unavailable'] ?? false),
                    'sort_order'        => $sort++,
                    'source_type'       => 'web_scrape',
                    'modifiers_json'    => $modifiers ? json_encode($modifiers) : null,
                    'raw_payload'       => $item,
                ];
            }
        }

        return $items;
    }

    protected function extractPrice(array $item): ?float
    {
        // cents → dollars  (Yelp often uses amount in cents)
        if (isset($item['price']['amount']) && is_numeric($item['price']['amount'])) {
            $v = (float) $item['price']['amount'];
            return round($v > 100 ? $v / 100 : $v, 2);
        }
        if (isset($item['price']) && is_numeric($item['price'])) {
            return round((float) $item['price'], 2);
        }
        if (isset($item['priceRange']['min'])) {
            $v = (float) $item['priceRange']['min'];
            return round($v > 100 ? $v / 100 : $v, 2);
        }
        // "$12.99" string
        if (isset($item['price']) && is_string($item['price'])) {
            preg_match('/[\d.]+/', $item['price'], $m);
            return isset($m[0]) ? round((float) $m[0], 2) : null;
        }
        return null;
    }

    protected function extractModifiers(array $item): array
    {
        $groups = $item['modifierGroups']
                  ?? $item['modifier_groups']
                  ?? $item['optionGroups']
                  ?? $item['options']
                  ?? [];

        if (empty($groups) || !is_array($groups)) {
            return [];
        }

        $result = [];
        foreach ($groups as $group) {
            if (!is_array($group)) {
                continue;
            }
            $groupName = trim((string) ($group['title'] ?? $group['name'] ?? 'Options'));
            $options   = [];

            foreach ($group['items'] ?? $group['options'] ?? $group['choices'] ?? [] as $opt) {
                if (!is_array($opt)) {
                    continue;
                }
                $optPrice = null;
                if (isset($opt['price']['amount']) && is_numeric($opt['price']['amount'])) {
                    $v = (float) $opt['price']['amount'];
                    $optPrice = round($v > 100 ? $v / 100 : $v, 2);
                } elseif (isset($opt['price']) && is_numeric($opt['price'])) {
                    $optPrice = round((float) $opt['price'], 2);
                }
                $options[] = [
                    'name'  => trim((string) ($opt['title'] ?? $opt['name'] ?? '')),
                    'price' => $optPrice,
                ];
            }

            $result[] = [
                'group'      => $groupName,
                'min_select' => (int) ($group['minSelect'] ?? $group['min_selected'] ?? $group['minRequired'] ?? 0),
                'max_select' => isset($group['maxSelect']) ? (int) $group['maxSelect'] : (isset($group['max_selected']) ? (int) $group['max_selected'] : null),
                'options'    => $options,
            ];
        }

        return $result;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Biz page extras
    // ──────────────────────────────────────────────────────────────────────────

    protected function extractEmbeddedJson(string $html): ?array
    {
        if (preg_match('/<script[^>]+id=["\']__NEXT_DATA__["\'][^>]*>([\s\S]*?)<\/script>/i', $html, $m)) {
            $data = json_decode($m[1], true);
            if ($data) {
                return $data['props']['pageProps']['businessData'] ?? null;
            }
        }
        return null;
    }
}
