<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Add Cache-Control: no-store to all API responses so Nginx proxy cache
 * never caches API endpoints. Also adds CORS headers as a fallback for
 * Nginx environments where .htaccess is ignored.
 */
class AddApiHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Prevent Nginx (or any reverse proxy) from caching API responses.
        // x-proxy-cache: HIT means a stale HTML page was being served instead of JSON.
        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');

        // Nginx-level CORS fallback — .htaccess is Apache-only.
        // HandleCors middleware already sets these, but if Nginx serves a cached
        // response Laravel never runs. Setting Vary ensures Nginx won't serve a
        // cached response for one origin to a different origin.
        $origin = $request->header('Origin');
        if ($origin && ! $response->headers->has('Access-Control-Allow-Origin')) {
            $allowed = config('cors.allowed_origins', []);
            $patterns = config('cors.allowed_origins_patterns', []);

            $isAllowed = in_array('*', $allowed)
                || in_array($origin, $allowed)
                || collect($patterns)->contains(fn ($p) => @preg_match($p, $origin));

            if ($isAllowed) {
                $response->headers->set('Access-Control-Allow-Origin', $origin);
                $response->headers->set('Access-Control-Allow-Credentials', 'true');
                $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-XSRF-TOKEN, X-Session-Id');
                $response->headers->set('Vary', 'Origin');
            }
        }

        return $response;
    }
}
