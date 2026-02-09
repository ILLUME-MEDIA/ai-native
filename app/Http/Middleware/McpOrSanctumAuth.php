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
        $apiKey = config('mcp.api_key');
        $bearer = $request->bearerToken();

        if (! empty($apiKey) && $bearer && hash_equals($apiKey, $bearer)) {
            return $next($request);
        }

        if ($request->user()) {
            return $next($request);
        }

        if (Auth::guard('sanctum')->user()) {
            return $next($request);
        }

        return response()->json([
            'message' => 'Unauthenticated. Use Sanctum login or provide a valid MCP API key in Authorization: Bearer <key>.',
        ], 401);
    }
}
