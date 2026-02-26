<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\MCPServer;
use App\Models\Workspace;
use App\Models\WorkspaceMCPServer;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class MCPController extends Controller
{
    use AuthorizesRequests;

    public function catalog(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);
        return response()->json(['servers' => MCPServer::orderBy('category')->orderBy('name')->get()]);
    }

    public function installed(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);
        $installs = WorkspaceMCPServer::where('workspace_id', $workspace->id)
            ->with('server')
            ->get();
        return response()->json(['installs' => $installs]);
    }

    public function install(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);
        $data = $request->validate(['mcp_server_id' => 'required|exists:mcp_servers,id']);
        $install = WorkspaceMCPServer::firstOrCreate(
            ['workspace_id' => $workspace->id, 'mcp_server_id' => $data['mcp_server_id']],
            ['config' => [], 'enabled' => true]
        );
        return response()->json(['install' => $install->load('server')]);
    }

    public function uninstall(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);
        $data = $request->validate(['mcp_server_id' => 'required|exists:mcp_servers,id']);
        WorkspaceMCPServer::where('workspace_id', $workspace->id)
            ->where('mcp_server_id', $data['mcp_server_id'])
            ->delete();
        return response()->json(['success' => true]);
    }

    public function configure(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);
        $data = $request->validate([
            'mcp_server_id' => 'required|exists:mcp_servers,id',
            'config'        => 'required|array',
        ]);
        $install = WorkspaceMCPServer::where('workspace_id', $workspace->id)
            ->where('mcp_server_id', $data['mcp_server_id'])
            ->firstOrFail();
        $install->update(['config' => $data['config']]);
        return response()->json(['install' => $install->load('server')]);
    }
}
