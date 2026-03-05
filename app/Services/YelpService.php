<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class YelpService
{
    protected Client $client;
    protected string $apiKey;

    public function __construct(?string $apiKey = null, ?Client $client = null)
    {
        $this->apiKey = $apiKey ?? config('services.yelp.api_key', env('YELP_API_KEY', ''));
        $this->client = $client ?? new Client(['timeout' => 10]);
    }

    protected function headers(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Accept'        => 'application/json',
        ];
    }

    public function searchBusiness(string $term, string $location = '', int $limit = 3): ?array
    {
        try {
            $resp = $this->client->get('https://api.yelp.com/v3/businesses/search', [
                'headers' => $this->headers(),
                'query'   => array_filter([
                    'term'     => $term,
                    'location' => $location,
                    'limit'    => $limit,
                ]),
            ]);

            $data = json_decode((string) $resp->getBody(), true);
            return $data['businesses'][0] ?? null;
        } catch (RequestException $e) {
            return null;
        }
    }

    public function getBusiness(string $id): ?array
    {
        try {
            $resp = $this->client->get("https://api.yelp.com/v3/businesses/{$id}", [
                'headers' => $this->headers(),
            ]);

            return json_decode((string) $resp->getBody(), true);
        } catch (RequestException $e) {
            return null;
        }
    }

    /**
     * Best-effort menu fetch. Yelp may return 404/empty for many businesses.
     */
    public function getBusinessMenu(string $id): ?array
    {
        try {
            $resp = $this->client->get("https://api.yelp.com/v3/businesses/{$id}/menu", [
                'headers' => $this->headers(),
            ]);

            return json_decode((string) $resp->getBody(), true);
        } catch (RequestException $e) {
            return null;
        }
    }

    /**
     * Fetch up to 3 recent reviews for a business.
     */
    public function getBusinessReviews(string $id): ?array
    {
        try {
            $resp = $this->client->get("https://api.yelp.com/v3/businesses/{$id}/reviews", [
                'headers' => $this->headers(),
                'query'   => ['limit' => 3, 'sort_by' => 'yelp_sort'],
            ]);

            return json_decode((string) $resp->getBody(), true);
        } catch (RequestException $e) {
            return null;
        }
    }

    /**
     * Convert Yelp HHMM string ("2130") to decimal hours (21.5).
     */
    protected function hhmmToDecimal(?string $hhmm): ?float
    {
        if (!$hhmm || strlen($hhmm) < 3) {
            return null;
        }
        $h = (int) substr($hhmm, 0, strlen($hhmm) - 2);
        $m = (int) substr($hhmm, -2);
        return round($h + ($m / 60), 4);
    }

    /**
     * Extract normalized flat values from a Yelp business DETAILS response.
     *
     * permanently_closed  — from details.is_closed (most reliable source).
     *                       true  = business has PERMANENTLY closed.
     *                       false = business still exists and is operating.
     *
     * is_open_now         — from hours[0].is_open_now.
     *                       true  = open at this exact moment.
     *                       false = currently closed (after hours) but NOT permanently.
     *                       null  = Yelp did not return hours data.
     *
     * Hours per weekday   — decimal format matching typical DB storage (11.0 = 11:00am,
     *                       21.5 = 9:30pm). Null when Yelp has no hours for that day.
     */
    public function extractFields(array $details, ?array $reviewsPayload = null): array
    {
        $location = $details['location'] ?? [];
        $coords   = $details['coordinates'] ?? [];
        $photos   = $details['photos'] ?? [];
        $cats     = $details['categories'] ?? [];
        $hours    = $details['hours'][0] ?? [];
        $attrs    = $details['attributes'] ?? [];
        $trans    = $details['transactions'] ?? [];

        // ── Hours per weekday ─────────────────────────────────────────────────
        $dayNames   = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        $hoursByDay = [];
        foreach ($hours['open'] ?? [] as $slot) {
            $dayName = $dayNames[$slot['day']] ?? null;
            if ($dayName) {
                $hoursByDay[$dayName] = $slot;
            }
        }

        $hoursFields = [];
        foreach ($dayNames as $day) {
            $slot = $hoursByDay[$day] ?? null;
            $hoursFields["{$day}_open"]  = $slot ? $this->hhmmToDecimal($slot['start'] ?? null) : null;
            $hoursFields["{$day}_close"] = $slot ? $this->hhmmToDecimal($slot['end']   ?? null) : null;
        }

        // ── Hours as full JSON ─────────────────────────────────────────────────
        $hoursJson = !empty($hours['open']) ? json_encode($hours['open']) : null;

        // ── Attributes / Vibe ─────────────────────────────────────────────────
        $attributesJson  = $attrs ? json_encode($attrs) : null;
        $ambienceJson    = !empty($attrs['ambience'])      ? json_encode($attrs['ambience'])      : null;
        $goodForMealJson = !empty($attrs['good_for_meal']) ? json_encode($attrs['good_for_meal']) : null;
        $parkingJson     = !empty($attrs['parking'])       ? json_encode($attrs['parking'])       : null;

        // ── Recent Reviews ────────────────────────────────────────────────────
        $recentReviewsJson = null;
        if ($reviewsPayload && !empty($reviewsPayload['reviews'])) {
            $recentReviewsJson = json_encode(array_map(fn ($r) => [
                'id'           => $r['id']           ?? null,
                'rating'       => $r['rating']       ?? null,
                'text'         => $r['text']         ?? null,
                'time_created' => $r['time_created'] ?? null,
                'user_name'    => $r['user']['name']      ?? null,
                'user_image'   => $r['user']['image_url'] ?? null,
                'url'          => $r['url']          ?? null,
            ], $reviewsPayload['reviews']));
        }

        return array_merge([
            // ── Basic ─────────────────────────────────────────────────────────
            'yelp_id'             => $details['id']           ?? null,
            'yelp_name'           => $details['name']         ?? null,
            'alias'               => $details['alias']        ?? null,
            'phone'               => $details['phone']        ?? null,
            'display_phone'       => $details['display_phone']?? null,
            'rating'              => $details['rating']       ?? null,
            'review_count'        => $details['review_count'] ?? null,
            // ACCURATE permanent closure — from details endpoint only
            'permanently_closed'  => isset($details['is_closed']) ? (bool) $details['is_closed'] : null,
            // Real-time open status (null when Yelp doesn't provide hours)
            'is_open_now'         => isset($hours['is_open_now']) ? (bool) $hours['is_open_now'] : null,
            'is_claimed'          => isset($details['is_claimed']) ? (bool) $details['is_claimed'] : null,
            'yelp_url'            => isset($details['url']) ? explode('?', $details['url'])[0] : null,
            'image_url'           => $details['image_url']    ?? null,
            'price'               => $details['price']        ?? null,
            'categories'          => $cats ? implode(', ', array_column($cats, 'title')) : null,
            // ── Location ──────────────────────────────────────────────────────
            'address1'            => $location['address1']  ?? null,
            'city'                => $location['city']      ?? null,
            'state'               => $location['state']     ?? null,
            'zip_code'            => $location['zip_code']  ?? null,
            'latitude'            => $coords['latitude']    ?? null,
            'longitude'           => $coords['longitude']   ?? null,
            // ── Photos ────────────────────────────────────────────────────────
            'photo_url'           => $photos[0] ?? null,
            'photo_url_2'         => $photos[1] ?? null,
            'photo_url_3'         => $photos[2] ?? null,
            'photos_json'         => $photos ? json_encode($photos) : null,
            // ── Business capabilities ─────────────────────────────────────────
            'transactions'        => $trans ? implode(', ', $trans) : null,
            // ── Hours JSON ────────────────────────────────────────────────────
            'hours_json'          => $hoursJson,
            // ── Attributes / Vibe ─────────────────────────────────────────────
            'outdoor_seating'     => isset($attrs['outdoor_seating']) ? (bool) $attrs['outdoor_seating'] : null,
            'ambience_json'       => $ambienceJson,
            'good_for_meal_json'  => $goodForMealJson,
            'parking_json'        => $parkingJson,
            'attributes_json'     => $attributesJson,
            // ── Recent Reviews ────────────────────────────────────────────────
            'recent_reviews_json' => $recentReviewsJson,
        ], $hoursFields);
    }

    /**
     * Normalize menu items from menu endpoint or details fallback.
     */
    public function extractMenuItems(array $details, ?array $menuPayload = null): array
    {
        $items = [];
        $sort = 0;
        $menuUrl = $details['attributes']['menu_url'] ?? null;
        $currency = $details['currency'] ?? 'USD';

        if ($menuPayload && isset($menuPayload['menu_items']) && is_array($menuPayload['menu_items'])) {
            foreach ($menuPayload['menu_items'] as $item) {
                $items[] = [
                    'yelp_menu_item_id' => $item['id'] ?? null,
                    'name'              => $item['name'] ?? 'Untitled',
                    'category'          => $item['category'] ?? null,
                    'description'       => $item['description'] ?? null,
                    'price'             => $this->extractPriceValue($item['price'] ?? null),
                    'currency'          => $currency,
                    'image'             => $item['image_url'] ?? null,
                    'sort_order'        => $sort++,
                    'source_type'       => 'menu_endpoint',
                    'raw_payload'       => $item,
                ];
            }
        }

        // Fallback when endpoint data isn't available: at least keep category/menu URL.
        if (empty($items)) {
            $categories = $details['categories'] ?? [];
            foreach ($categories as $cat) {
                $title = $cat['title'] ?? null;
                if (!$title) {
                    continue;
                }
                $items[] = [
                    'yelp_menu_item_id' => null,
                    'name'              => $title,
                    'category'          => 'Yelp Category',
                    'description'       => $menuUrl ?: 'Menu URL unavailable',
                    'price'             => null,
                    'currency'          => $currency,
                    'image'             => null,
                    'sort_order'        => $sort++,
                    'source_type'       => 'details_fallback',
                    'raw_payload'       => $cat,
                ];
            }
        }

        return $items;
    }

    protected function extractPriceValue(mixed $raw): ?float
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if (is_numeric($raw)) {
            return round((float) $raw, 2);
        }

        if (preg_match('/([0-9]+(\.[0-9]+)?)/', (string) $raw, $m)) {
            return round((float) $m[1], 2);
        }

        return null;
    }

    /**
     * All Yelp fields available for column mapping.
     * key => ['label', 'type']  (type matches SectionField types)
     */
    public static function availableFields(): array
    {
        return [
            // ── Basic ─────────────────────────────────────────────────────────
            'yelp_id'             => ['label' => 'Yelp Business ID',               'type' => 'string'],
            'yelp_name'           => ['label' => 'Business Name (Yelp)',            'type' => 'string'],
            'alias'               => ['label' => 'Yelp Alias / Slug',              'type' => 'string'],
            'phone'               => ['label' => 'Phone (E.164)',                   'type' => 'string'],
            'display_phone'       => ['label' => 'Display Phone',                   'type' => 'string'],
            'rating'              => ['label' => 'Rating (0–5)',                    'type' => 'decimal'],
            'review_count'        => ['label' => 'Review Count',                   'type' => 'integer'],
            'permanently_closed'  => ['label' => 'Permanently Closed',             'type' => 'boolean'],
            'is_open_now'         => ['label' => 'Open Right Now (real-time)',      'type' => 'boolean'],
            'is_claimed'          => ['label' => 'Claimed on Yelp',                'type' => 'boolean'],
            'yelp_url'            => ['label' => 'Yelp URL',                       'type' => 'text'],
            'image_url'           => ['label' => 'Main Image URL (Yelp)',           'type' => 'text'],
            'price'               => ['label' => 'Price ($–$$$$)',                 'type' => 'string'],
            'categories'          => ['label' => 'Categories',                     'type' => 'string'],
            // ── Location ──────────────────────────────────────────────────────
            'address1'            => ['label' => 'Street Address',                 'type' => 'string'],
            'city'                => ['label' => 'City',                           'type' => 'string'],
            'state'               => ['label' => 'State / Province',               'type' => 'string'],
            'zip_code'            => ['label' => 'Zip Code',                       'type' => 'string'],
            'latitude'            => ['label' => 'Latitude',                       'type' => 'decimal'],
            'longitude'           => ['label' => 'Longitude',                      'type' => 'decimal'],
            // ── Photos ────────────────────────────────────────────────────────
            'photo_url'           => ['label' => 'Photo 1 URL',                    'type' => 'text'],
            'photo_url_2'         => ['label' => 'Photo 2 URL',                    'type' => 'text'],
            'photo_url_3'         => ['label' => 'Photo 3 URL',                    'type' => 'text'],
            'photos_json'         => ['label' => 'All Photos (JSON array)',        'type' => 'text'],
            // ── Business capabilities ─────────────────────────────────────────
            'transactions'        => ['label' => 'Transactions (delivery, pickup…)', 'type' => 'string'],
            // ── Hours ─────────────────────────────────────────────────────────
            'hours_json'          => ['label' => 'Hours Full (JSON)',               'type' => 'text'],
            'monday_open'         => ['label' => 'Monday Open (decimal hrs)',       'type' => 'decimal'],
            'monday_close'        => ['label' => 'Monday Close (decimal hrs)',      'type' => 'decimal'],
            'tuesday_open'        => ['label' => 'Tuesday Open (decimal hrs)',      'type' => 'decimal'],
            'tuesday_close'       => ['label' => 'Tuesday Close (decimal hrs)',     'type' => 'decimal'],
            'wednesday_open'      => ['label' => 'Wednesday Open (decimal hrs)',    'type' => 'decimal'],
            'wednesday_close'     => ['label' => 'Wednesday Close (decimal hrs)',   'type' => 'decimal'],
            'thursday_open'       => ['label' => 'Thursday Open (decimal hrs)',     'type' => 'decimal'],
            'thursday_close'      => ['label' => 'Thursday Close (decimal hrs)',    'type' => 'decimal'],
            'friday_open'         => ['label' => 'Friday Open (decimal hrs)',       'type' => 'decimal'],
            'friday_close'        => ['label' => 'Friday Close (decimal hrs)',      'type' => 'decimal'],
            'saturday_open'       => ['label' => 'Saturday Open (decimal hrs)',     'type' => 'decimal'],
            'saturday_close'      => ['label' => 'Saturday Close (decimal hrs)',    'type' => 'decimal'],
            'sunday_open'         => ['label' => 'Sunday Open (decimal hrs)',       'type' => 'decimal'],
            'sunday_close'        => ['label' => 'Sunday Close (decimal hrs)',      'type' => 'decimal'],
            // ── Attributes / Vibe ─────────────────────────────────────────────
            'outdoor_seating'     => ['label' => 'Outdoor Seating',                'type' => 'boolean'],
            'ambience_json'       => ['label' => 'Ambience / Vibe (JSON)',          'type' => 'text'],
            'good_for_meal_json'  => ['label' => 'Good For Meal (JSON)',            'type' => 'text'],
            'parking_json'        => ['label' => 'Parking (JSON)',                  'type' => 'text'],
            'attributes_json'     => ['label' => 'All Attributes (JSON)',           'type' => 'text'],
            // ── Recent Reviews ────────────────────────────────────────────────
            'recent_reviews_json' => ['label' => 'Recent Reviews — up to 3 (JSON)', 'type' => 'text'],
        ];
    }
}
