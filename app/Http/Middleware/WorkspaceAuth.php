<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticate workspace API routes.
 *
 * Priority:
 *  1. Session guard (auth:web / Sanctum stateful) — works in production
 *  2. SITE_API_KEY Bearer token → authenticate as first admin user
 *     Works locally where the admin SPA has no login session but still
 *     sends the site API key from window.__SITE_API_KEY__.
 */
class WorkspaceAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Already authenticated via session (production + Sanctum stateful)
        if (auth()->check()) {
            return $next($request);
        }

        // 2. SITE_API_KEY Bearer token fallback
        $siteKey = config('mcp.site_api_key');
        $bearer  = $request->bearerToken();

        if (! empty($siteKey) && ! empty($bearer) && hash_equals($siteKey, $bearer)) {
            $user = User::first();
            if ($user) {
                auth()->setUser($user);
                return $next($request);
            }
        }

        return response()->json(['message' => 'Unauthorized'], 401);
    }
}
