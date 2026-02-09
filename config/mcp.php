<?php

return [

    /*
    |--------------------------------------------------------------------------
    | MCP API Key (for external access: OpenAI, Cursor, etc.)
    |--------------------------------------------------------------------------
    |
    | Set MCP_API_KEY in .env. When external clients send:
    |   Authorization: Bearer <your-mcp-api-key>
    | they can access MCP endpoints. Only entities with mcp_enabled and
    | the corresponding mcp_can_read / mcp_can_create etc. will be allowed.
    |
    */

    'api_key' => env('MCP_API_KEY', ''),

];
