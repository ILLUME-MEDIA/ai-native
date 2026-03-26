<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use App\Models\WorkspacePresence;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PresenceController extends Controller
{
    /**
     * B-20: Record that the current user is still active in this workspace.
     * Called by the frontend every ~12 seconds.
     */
    public function heartbeat(Request $request, Workspace $workspace): \Illuminate\Http\JsonResponse
    {
        $data = $request->validate([
            'open_file'   => 'nullable|string|max:500',
            'cursor_line' => 'nullable|integer|min:1',
            'cursor_col'  => 'nullable|integer|min:1',
        ]);

        WorkspacePresence::updateOrCreate(
            ['workspace_id' => $workspace->id, 'user_id' => Auth::id()],
            [
                'open_file'   => $data['open_file']   ?? null,
                'cursor_line' => $data['cursor_line']  ?? null,
                'cursor_col'  => $data['cursor_col']   ?? null,
                'last_seen_at' => now(),
            ]
        );

        return response()->json(['ok' => true]);
    }

    /**
     * B-20: Return all OTHER users active in this workspace within the last 30 s.
     */
    public function list(Workspace $workspace): \Illuminate\Http\JsonResponse
    {
        $cutoff = now()->subSeconds(30);

        $users = WorkspacePresence::with('user:id,name')
            ->where('workspace_id', $workspace->id)
            ->where('last_seen_at', '>=', $cutoff)
            ->where('user_id', '!=', Auth::id())
            ->get()
            ->map(fn($p) => [
                'user_id'     => $p->user_id,
                'name'        => $p->user?->name ?? 'Unknown',
                'open_file'   => $p->open_file,
                'cursor_line' => $p->cursor_line,
                'cursor_col'  => $p->cursor_col,
            ]);

        return response()->json(['users' => $users]);
    }
}
