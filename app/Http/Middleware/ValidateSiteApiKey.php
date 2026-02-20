<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Require a valid SITE_API_KEY (from .env) as Bearer token.
 *
 * Used on public-facing endpoints like POST /api/register-business
 * so external sites must send:
 *   Authorization: Bearer <SITE_API_KEY>
 *
 * Also accepts MCP_API_KEY for system-level integrations.
 * Does NOT require a logged-in user.
 */
class ValidateSiteApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $siteKey = config('mcp.site_api_key');
        $mcpKey  = config('mcp.mcp_api_key');
        $bearer  = $request->bearerToken();

        if (empty($bearer)) {
            return response()->json([
                'message' => 'API key required. Send: Authorization: Bearer <SITE_API_KEY>',
            ], 401);
        }

        // Accept SITE_API_KEY or MCP_API_KEY
        if (
            (! empty($siteKey) && hash_equals($siteKey, $bearer)) ||
            (! empty($mcpKey)  && hash_equals($mcpKey, $bearer))
        ) {
            return $next($request);
        }

        return response()->json([
            'message' => 'Invalid API key.',
        ], 401);
    }
}
