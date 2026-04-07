<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

/**
 * Google Places API (New) service.
 * Searches for a business and fetches full details.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/overview
 */
class GoogleService
{
    protected Client $client;
    protected string $apiKey;

    // All fields we request from the Places Details API
    protected const PLACE_FIELDS = [
        'id',
        'displayName',
        'formattedAddress',
        'nationalPhoneNumber',
        'internationalPhoneNumber',
        'websiteUri',
        'rating',
        'userRatingCount',
        'priceLevel',
        'businessStatus',
        'googleMapsUri',
        'location',
        'plusCode',
        'currentOpeningHours',
        'regularOpeningHours',
        'primaryTypeDisplayName',
        'types',
        'editorialSummary',
        'photos',
        'reviews',
        'takeout',
        'delivery',
        'dineIn',
        'reservable',
        'outdoorSeating',
        'wheelchairAccessibleEntrance',
        'servesBeer',
        'servesWine',
        'servesBreakfast',
        'servesLunch',
        'servesDinner',
        'servesBrunch',
        'servesCocktails',
        'servesDessert',
        'servesCoffee',
        'servesVegetarianFood',
        'goodForChildren',
        'goodForGroups',
        'goodForWatchingSports',
        'liveMusic',
        'menuForChildren',
    ];

    public function __construct(?string $apiKey = null, ?Client $client = null)
    {
        $this->apiKey = $apiKey ?? config('services.google.places_api_key', env('GOOGLE_PLACES_API_KEY', ''));
        // 6s connect + 8s response — fast enough, not too tight
        $this->client = $client ?? new Client([
            'timeout'         => 8,
            'connect_timeout' => 6,
            'http_errors'     => false, // handle 4xx/5xx ourselves for retry logic
        ]);
    }

    /**
     * Search for a place using Text Search.
     * Returns the best match's place resource name (e.g. "places/ChIJ...") or null.
     * Auto-retries once on 429 (rate limit).
     */
    public function searchPlace(string $name, string $location = ''): ?string
    {
        $query = trim($name . ($location ? ' ' . $location : ''));

        for ($attempt = 0; $attempt < 2; $attempt++) {
            try {
                $resp = $this->client->post('https://places.googleapis.com/v1/places:searchText', [
                    'headers' => [
                        'X-Goog-Api-Key'   => $this->apiKey,
                        'X-Goog-FieldMask' => 'places.id',
                        'Content-Type'     => 'application/json',
                    ],
                    'json' => [
                        'textQuery'      => $query,
                        'maxResultCount' => 1,
                        'languageCode'   => 'en',
                    ],
                ]);

                $status = $resp->getStatusCode();

                if ($status === 429) {
                    sleep(1); // back off 1s on rate limit, then retry
                    continue;
                }

                if ($status !== 200) {
                    return null;
                }

                $data = json_decode((string) $resp->getBody(), true);
                return $data['places'][0]['id'] ?? null;

            } catch (\Throwable $e) {
                return null;
            }
        }

        return null;
    }

    /**
     * Fetch full details for a place by its resource name (e.g. "places/ChIJ...").
     * Auto-retries once on 429.
     */
    public function getPlaceDetails(string $placeResourceName): ?array
    {
        $fieldMask = implode(',', self::PLACE_FIELDS);

        for ($attempt = 0; $attempt < 2; $attempt++) {
            try {
                $resp = $this->client->get("https://places.googleapis.com/v1/{$placeResourceName}", [
                    'headers' => [
                        'X-Goog-Api-Key'   => $this->apiKey,
                        'X-Goog-FieldMask' => $fieldMask,
                    ],
                ]);

                $status = $resp->getStatusCode();

                if ($status === 429) {
                    sleep(1);
                    continue;
                }

                if ($status !== 200) {
                    return null;
                }

                return json_decode((string) $resp->getBody(), true);

            } catch (\Throwable $e) {
                return null;
            }
        }

        return null;
    }

    /**
     * Normalize raw Place Details into a flat key→value array.
     * All keys are prefixed with "google_".
     */
    public function extractFields(array $details): array
    {
        $d = $details;

        $hours = [];
        $openNow = null;
        $hoursData = $d['currentOpeningHours'] ?? $d['regularOpeningHours'] ?? null;
        if ($hoursData) {
            $openNow = $hoursData['openNow'] ?? null;
            $weekdayText = $hoursData['weekdayDescriptions'] ?? [];
            $hours = $weekdayText;
        }

        $photos = [];
        foreach (array_slice($d['photos'] ?? [], 0, 5) as $photo) {
            $ref = $photo['name'] ?? null;
            if ($ref) {
                $photos[] = "https://places.googleapis.com/v1/{$ref}/media?maxWidthPx=800&key={$this->apiKey}";
            }
        }

        $reviews = [];
        foreach (array_slice($d['reviews'] ?? [], 0, 5) as $review) {
            $reviews[] = [
                'author'    => $review['authorAttribution']['displayName'] ?? null,
                'rating'    => $review['rating'] ?? null,
                'text'      => $review['text']['text'] ?? null,
                'time'      => $review['relativePublishTimeDescription'] ?? null,
            ];
        }

        $types = array_map(
            fn ($t) => is_string($t) ? $t : ($t['displayName']['text'] ?? null),
            $d['types'] ?? []
        );
        $types = array_filter($types);

        $primaryType = $d['primaryTypeDisplayName']['text'] ?? null;
        $editorialSummary = $d['editorialSummary']['text'] ?? null;
        $businessStatus = $d['businessStatus'] ?? null;

        return [
            'google_place_id'               => $d['id'] ?? null,
            'google_name'                   => $d['displayName']['text'] ?? null,
            'google_rating'                 => $d['rating'] ?? null,
            'google_review_count'           => $d['userRatingCount'] ?? null,
            'google_business_status'        => $businessStatus,
            'google_open_now'               => $openNow,
            'google_phone'                  => $d['nationalPhoneNumber'] ?? $d['internationalPhoneNumber'] ?? null,
            'google_website'                => $d['websiteUri'] ?? null,
            'google_address'                => $d['formattedAddress'] ?? null,
            'google_maps_url'               => $d['googleMapsUri'] ?? null,
            'google_lat'                    => $d['location']['latitude'] ?? null,
            'google_lng'                    => $d['location']['longitude'] ?? null,
            'google_plus_code'              => $d['plusCode']['globalCode'] ?? null,
            'google_price_level'            => $d['priceLevel'] ?? null,
            'google_primary_type'           => $primaryType,
            'google_types_json'             => !empty($types) ? json_encode(array_values($types)) : null,
            'google_hours_json'             => !empty($hours) ? json_encode($hours) : null,
            'google_photos_json'            => !empty($photos) ? json_encode($photos) : null,
            'google_reviews_json'           => !empty($reviews) ? json_encode($reviews) : null,
            'google_editorial_summary'      => $editorialSummary,
            'google_delivery'               => isset($d['delivery']) ? (bool) $d['delivery'] : null,
            'google_takeout'                => isset($d['takeout']) ? (bool) $d['takeout'] : null,
            'google_dine_in'                => isset($d['dineIn']) ? (bool) $d['dineIn'] : null,
            'google_reservable'             => isset($d['reservable']) ? (bool) $d['reservable'] : null,
            'google_outdoor_seating'        => isset($d['outdoorSeating']) ? (bool) $d['outdoorSeating'] : null,
            'google_wheelchair_accessible'  => isset($d['wheelchairAccessibleEntrance']) ? (bool) $d['wheelchairAccessibleEntrance'] : null,
            'google_serves_beer'            => isset($d['servesBeer']) ? (bool) $d['servesBeer'] : null,
            'google_serves_wine'            => isset($d['servesWine']) ? (bool) $d['servesWine'] : null,
            'google_serves_breakfast'       => isset($d['servesBreakfast']) ? (bool) $d['servesBreakfast'] : null,
            'google_serves_lunch'           => isset($d['servesLunch']) ? (bool) $d['servesLunch'] : null,
            'google_serves_dinner'          => isset($d['servesDinner']) ? (bool) $d['servesDinner'] : null,
            'google_serves_brunch'          => isset($d['servesBrunch']) ? (bool) $d['servesBrunch'] : null,
            'google_serves_cocktails'       => isset($d['servesCocktails']) ? (bool) $d['servesCocktails'] : null,
            'google_serves_dessert'         => isset($d['servesDessert']) ? (bool) $d['servesDessert'] : null,
            'google_serves_coffee'          => isset($d['servesCoffee']) ? (bool) $d['servesCoffee'] : null,
            'google_serves_vegetarian'      => isset($d['servesVegetarianFood']) ? (bool) $d['servesVegetarianFood'] : null,
            'google_good_for_children'      => isset($d['goodForChildren']) ? (bool) $d['goodForChildren'] : null,
            'google_good_for_groups'        => isset($d['goodForGroups']) ? (bool) $d['goodForGroups'] : null,
            'google_good_for_watching_sports' => isset($d['goodForWatchingSports']) ? (bool) $d['goodForWatchingSports'] : null,
            'google_live_music'             => isset($d['liveMusic']) ? (bool) $d['liveMusic'] : null,
            'google_menu_for_children'      => isset($d['menuForChildren']) ? (bool) $d['menuForChildren'] : null,
        ];
    }

    /**
     * Verify the API key is working via a lightweight test search.
     */
    public function testApiKey(): bool
    {
        $id = $this->searchPlace('Starbucks', 'New York, NY');
        return $id !== null;
    }

    /**
     * Static list of all mappable Google fields with labels and types.
     * Used by the frontend column-mapping UI.
     */
    public static function availableFields(): array
    {
        return [
            // Identity
            ['key' => 'google_place_id',              'label' => 'Google Place ID',              'type' => 'string'],
            ['key' => 'google_name',                  'label' => 'Google Business Name',         'type' => 'string'],
            ['key' => 'google_business_status',       'label' => 'Business Status',              'type' => 'string', 'note' => 'OPERATIONAL / CLOSED_PERMANENTLY / CLOSED_TEMPORARILY'],
            // Ratings
            ['key' => 'google_rating',                'label' => 'Google Rating (1–5)',          'type' => 'decimal'],
            ['key' => 'google_review_count',          'label' => 'Google Review Count',          'type' => 'integer'],
            ['key' => 'google_price_level',           'label' => 'Price Level',                  'type' => 'string', 'note' => 'FREE / INEXPENSIVE / MODERATE / EXPENSIVE / VERY_EXPENSIVE'],
            // Contact
            ['key' => 'google_phone',                 'label' => 'Phone Number',                 'type' => 'string'],
            ['key' => 'google_website',               'label' => 'Website URL',                  'type' => 'string'],
            ['key' => 'google_address',               'label' => 'Formatted Address',            'type' => 'string'],
            ['key' => 'google_maps_url',              'label' => 'Google Maps URL',              'type' => 'string'],
            // Location
            ['key' => 'google_lat',                   'label' => 'Latitude',                     'type' => 'decimal'],
            ['key' => 'google_lng',                   'label' => 'Longitude',                    'type' => 'decimal'],
            ['key' => 'google_plus_code',             'label' => 'Plus Code',                    'type' => 'string'],
            // Hours & Status
            ['key' => 'google_open_now',              'label' => 'Currently Open',               'type' => 'boolean'],
            ['key' => 'google_hours_json',            'label' => 'Opening Hours (JSON)',          'type' => 'json'],
            // Type
            ['key' => 'google_primary_type',          'label' => 'Primary Business Type',        'type' => 'string'],
            ['key' => 'google_types_json',            'label' => 'All Types (JSON)',              'type' => 'json'],
            // Rich content
            ['key' => 'google_editorial_summary',     'label' => 'Editorial Summary',            'type' => 'text'],
            ['key' => 'google_photos_json',           'label' => 'Photos (JSON array of URLs)',  'type' => 'json'],
            ['key' => 'google_reviews_json',          'label' => 'Reviews (JSON)',               'type' => 'json'],
            // Services
            ['key' => 'google_delivery',              'label' => 'Delivery Available',           'type' => 'boolean'],
            ['key' => 'google_takeout',               'label' => 'Takeout Available',            'type' => 'boolean'],
            ['key' => 'google_dine_in',               'label' => 'Dine-in Available',            'type' => 'boolean'],
            ['key' => 'google_reservable',            'label' => 'Reservable',                   'type' => 'boolean'],
            ['key' => 'google_outdoor_seating',       'label' => 'Outdoor Seating',              'type' => 'boolean'],
            ['key' => 'google_wheelchair_accessible', 'label' => 'Wheelchair Accessible',        'type' => 'boolean'],
            // Food & drink
            ['key' => 'google_serves_beer',           'label' => 'Serves Beer',                  'type' => 'boolean'],
            ['key' => 'google_serves_wine',           'label' => 'Serves Wine',                  'type' => 'boolean'],
            ['key' => 'google_serves_breakfast',      'label' => 'Serves Breakfast',             'type' => 'boolean'],
            ['key' => 'google_serves_lunch',          'label' => 'Serves Lunch',                 'type' => 'boolean'],
            ['key' => 'google_serves_dinner',         'label' => 'Serves Dinner',                'type' => 'boolean'],
            ['key' => 'google_serves_brunch',         'label' => 'Serves Brunch',                'type' => 'boolean'],
            ['key' => 'google_serves_cocktails',      'label' => 'Serves Cocktails',             'type' => 'boolean'],
            ['key' => 'google_serves_dessert',        'label' => 'Serves Dessert',               'type' => 'boolean'],
            ['key' => 'google_serves_coffee',         'label' => 'Serves Coffee',                'type' => 'boolean'],
            ['key' => 'google_serves_vegetarian',     'label' => 'Serves Vegetarian Food',       'type' => 'boolean'],
            // Vibe
            ['key' => 'google_good_for_children',         'label' => 'Good for Children',            'type' => 'boolean'],
            ['key' => 'google_good_for_groups',           'label' => 'Good for Groups',              'type' => 'boolean'],
            ['key' => 'google_good_for_watching_sports',  'label' => 'Good for Watching Sports',     'type' => 'boolean'],
            ['key' => 'google_live_music',                'label' => 'Live Music',                   'type' => 'boolean'],
            ['key' => 'google_menu_for_children',         'label' => 'Menu for Children',            'type' => 'boolean'],
        ];
    }
}
