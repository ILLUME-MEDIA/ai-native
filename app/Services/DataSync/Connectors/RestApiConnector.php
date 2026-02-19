<?php

namespace App\Services\DataSync\Connectors;

use App\Services\DataSync\Contracts\ConnectorInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Arr;

/**
 * Fetches businesses from a REST API with page-based pagination.
 *
 * Config keys:
 *   base_url   (required) - e.g. https://api.pakistanhub.com
 *   endpoint   (required) - e.g. /api/businesses
 *   auth_type  (optional) - bearer | basic | api_key (default: bearer)
 *   token      (optional) - bearer token or API key value
 *   api_key_header (optional) - header name for api_key auth (default: X-Api-Key)
 *   username   (optional) - for basic auth
 *   password   (optional) - for basic auth
 *   per_page   (optional) - page size (default: 50)
 *   page_param (optional) - query param name for page (default: page)
 *   per_page_param (optional) - query param name for per_page (default: per_page)
 *   data_key   (optional) - dot-notation key that holds records array (default: data)
 *   total_key  (optional) - dot-notation key for total count (default: total)
 *   field_map  (optional) - { "source_field": "business_field" }
 */
class RestApiConnector implements ConnectorInterface
{
    private int $totalCount = 0;

    public function __construct(private readonly array $config) {}

    public function count(): int
    {
        return $this->totalCount;
    }

    public function businesses(): iterable
    {
        $perPage   = (int) ($this->config['per_page'] ?? 50);
        $pageParam = $this->config['page_param'] ?? 'page';
        $ppParam   = $this->config['per_page_param'] ?? 'per_page';
        $dataKey   = $this->config['data_key'] ?? 'data';
        $totalKey  = $this->config['total_key'] ?? 'total';
        $page      = 1;

        do {
            $response = $this->makeRequest([
                $pageParam => $page,
                $ppParam   => $perPage,
            ]);

            $body  = $response->json();
            $items = Arr::get($body, $dataKey, []);

            if ($page === 1) {
                $this->totalCount = (int) Arr::get($body, $totalKey, 0);
            }

            foreach ($items as $item) {
                yield is_array($item) ? $item : (array) $item;
            }

            $page++;
        } while (count($items) >= $perPage);
    }

    private function makeRequest(array $params): \Illuminate\Http\Client\Response
    {
        $url      = rtrim($this->config['base_url'], '/') . '/' . ltrim($this->config['endpoint'] ?? '/api/businesses', '/');
        $authType = $this->config['auth_type'] ?? 'bearer';
        $http     = Http::timeout(30)->acceptJson();

        match ($authType) {
            'bearer'  => $http = $http->withToken($this->config['token'] ?? ''),
            'basic'   => $http = $http->withBasicAuth($this->config['username'] ?? '', $this->config['password'] ?? ''),
            'api_key' => $http = $http->withHeader($this->config['api_key_header'] ?? 'X-Api-Key', $this->config['token'] ?? ''),
            default   => null,
        };

        return $http->get($url, $params)->throw();
    }

    public function fieldMap(): array
    {
        return $this->config['field_map'] ?? [];
    }
}
