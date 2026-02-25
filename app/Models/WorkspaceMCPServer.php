<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkspaceMCPServer extends Model
{
    protected $table = 'workspace_mcp_servers';

    protected $fillable = ['workspace_id', 'mcp_server_id', 'config', 'enabled'];

    protected $casts = [
        'config'  => 'array',
        'enabled' => 'boolean',
    ];

    public function server()
    {
        return $this->belongsTo(MCPServer::class, 'mcp_server_id');
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }
}
