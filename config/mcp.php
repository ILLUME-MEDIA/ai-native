<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Global MCP API Key (for AI / OpenAI / system clients)
    |--------------------------------------------------------------------------
    |
    | Set MCP_API_KEY in .env. When external AI / MCP clients send:
    |   Authorization: Bearer <MCP_API_KEY>
    | they can access MCP + dynamic entity endpoints (subject to MCP
    | permissions).
    |
    */

    'mcp_api_key' => env('MCP_API_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | Site API Key (for generic site / app integrations)
    |--------------------------------------------------------------------------
    |
    | Set SITE_API_KEY in .env. This is a second, distinct API key that
    | non-AI integrations (your own services, simple backends, etc.) can use:
    |   Authorization: Bearer <SITE_API_KEY>
    |
    | This keeps MCP (AI) traffic separate from normal site API traffic.
    |
    */

    'site_api_key' => env('SITE_API_KEY', ''),

];
