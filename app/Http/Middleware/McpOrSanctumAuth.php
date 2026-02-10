<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class McpOrSanctumAuth
{
    /**
     * Allow request if either:
     * - User is authenticated via Sanctum (admin / Section Editor), or
     * - Request has valid MCP API key (Bearer token) for external clients (OpenAI, etc.)
     */
    public function handle(Request $request, Closure $next): Response
    {
        $mcpKey = config('mcp.mcp_api_key');
        $siteKey = config('mcp.site_api_key');
        $bearer = $request->bearerToken();

        // 1) Global MCP key (AI / OpenAI / system-level clients)
        if (! empty($mcpKey) && $bearer && hash_equals($mcpKey, $bearer)) {
            // Optionally, we could tag the request as 'mcp' actor here.
            return $next($request);
        }

        // 2) Site API key (generic site/app-level integrations)
        if (! empty($siteKey) && $bearer && hash_equals($siteKey, $bearer)) {
            return $next($request);
        }

        if ($request->user()) {
            return $next($request);
        }

        if (Auth::guard('sanctum')->user()) {
            return $next($request);
        }

        return response()->json([
            'message' => 'Unauthenticated. Use Sanctum login, a user token, or provide a valid API key in Authorization: Bearer <MCP_API_KEY|SITE_API_KEY>.',
        ], 401);
    }
}
