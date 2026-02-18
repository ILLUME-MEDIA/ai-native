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
     * Extract normalized flat values from a Yelp business DETAILS response.
     *
     * permanently_closed  — comes from details.is_closed (most reliable source).
     *                       true  = business has PERMANENTLY closed / gone out of business.
     *                       false = business still exists and is operating.
     *
     * is_open_now         — comes from hours[0].is_open_now.
     *                       true  = open at this exact moment.
     *                       false = currently closed (e.g. after hours) but NOT permanently.
     *                       null  = Yelp did not return hours data.
     *
     * Note: NEVER use search-result `is_closed` to detect permanent closure — that field
     * can flip to true during off-hours on some Yelp responses. Always use the Details
     * endpoint's `is_closed` (this method) for an accurate permanent-closure flag.
     */
    public function extractFields(array $details): array
    {
        $location = $details['location'] ?? [];
        $coords   = $details['coordinates'] ?? [];
        $photos   = $details['photos'] ?? [];
        $cats     = $details['categories'] ?? [];
        $hours    = $details['hours'][0] ?? [];

        return [
            'yelp_id'            => $details['id'] ?? null,
            'yelp_name'          => $details['name'] ?? null,
            'phone'              => $details['phone'] ?? null,
            'display_phone'      => $details['display_phone'] ?? null,
            'rating'             => $details['rating'] ?? null,
            'review_count'       => $details['review_count'] ?? null,
            // ACCURATE permanent closure — from details endpoint only
            'permanently_closed' => isset($details['is_closed']) ? (bool) $details['is_closed'] : null,
            // Real-time open status (null when Yelp doesn't provide hours)
            'is_open_now'        => isset($hours['is_open_now']) ? (bool) $hours['is_open_now'] : null,
            'yelp_url'           => $details['url'] ?? null,
            'price'              => $details['price'] ?? null,
            'categories'         => $cats ? implode(', ', array_column($cats, 'title')) : null,
            'address1'           => $location['address1'] ?? null,
            'city'               => $location['city'] ?? null,
            'state'              => $location['state'] ?? null,
            'zip_code'           => $location['zip_code'] ?? null,
            'latitude'           => $coords['latitude'] ?? null,
            'longitude'          => $coords['longitude'] ?? null,
            'photo_url'          => $photos[0] ?? null,
        ];
    }

    /**
     * All Yelp fields available for column mapping.
     * key => ['label', 'type']  (type matches SectionField types)
     */
    public static function availableFields(): array
    {
        return [
            'yelp_id'            => ['label' => 'Yelp Business ID',              'type' => 'string'],
            'yelp_name'          => ['label' => 'Business Name (Yelp)',           'type' => 'string'],
            'phone'              => ['label' => 'Phone',                          'type' => 'string'],
            'display_phone'      => ['label' => 'Display Phone',                  'type' => 'string'],
            'rating'             => ['label' => 'Rating (0–5)',                   'type' => 'decimal'],
            'review_count'       => ['label' => 'Review Count',                  'type' => 'integer'],
            'permanently_closed' => ['label' => 'Permanently Closed',            'type' => 'boolean'],
            'is_open_now'        => ['label' => 'Open Right Now (real-time)',     'type' => 'boolean'],
            'yelp_url'           => ['label' => 'Yelp URL',                      'type' => 'string'],
            'price'              => ['label' => 'Price ($–$$$$)',                'type' => 'string'],
            'categories'         => ['label' => 'Categories',                    'type' => 'string'],
            'address1'           => ['label' => 'Street Address',                'type' => 'string'],
            'city'               => ['label' => 'City',                          'type' => 'string'],
            'state'              => ['label' => 'State / Province',              'type' => 'string'],
            'zip_code'           => ['label' => 'Zip Code',                      'type' => 'string'],
            'latitude'           => ['label' => 'Latitude',                      'type' => 'decimal'],
            'longitude'          => ['label' => 'Longitude',                     'type' => 'decimal'],
            'photo_url'          => ['label' => 'Main Photo URL',                'type' => 'string'],
        ];
    }
}
