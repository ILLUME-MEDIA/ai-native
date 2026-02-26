<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MCPServer extends Model
{
    protected $table = 'mcp_servers';

    protected $fillable = [
        'slug', 'name', 'description', 'category', 'author',
        'command', 'args_schema', 'env_schema', 'npm_package', 'docs_url',
    ];

    protected $casts = [
        'command'     => 'array',
        'args_schema' => 'array',
        'env_schema'  => 'array',
    ];

    public function workspaceInstalls()
    {
        return $this->hasMany(WorkspaceMCPServer::class, 'mcp_server_id');
    }
}
