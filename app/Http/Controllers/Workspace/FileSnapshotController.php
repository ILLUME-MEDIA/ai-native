<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\FileSnapshot;
use App\Models\Workspace;
use Illuminate\Http\Request;

class FileSnapshotController extends Controller
{
    public function store(Request $request, Workspace $workspace)
    {
        $request->validate([
            'path'    => 'required|string|max:2000',
            'content' => 'required|string',
        ]);

        $snapshot = FileSnapshot::create([
            'workspace_id' => $workspace->id,
            'file_path'    => $request->path,
            'content'      => $request->content,
        ]);

        // Prune: keep last 20 snapshots per file
        $toDelete = FileSnapshot::where('workspace_id', $workspace->id)
            ->where('file_path', $request->path)
            ->orderBy('created_at', 'desc')
            ->skip(20)
            ->pluck('id');

        if ($toDelete->isNotEmpty()) {
            FileSnapshot::whereIn('id', $toDelete)->delete();
        }

        return response()->json(['id' => $snapshot->id], 201);
    }

    public function index(Request $request, Workspace $workspace)
    {
        $request->validate([
            'path' => 'required|string|max:2000',
        ]);

        $snapshots = FileSnapshot::where('workspace_id', $workspace->id)
            ->where('file_path', $request->path)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get(['id', 'file_path', 'created_at']);

        return response()->json($snapshots);
    }

    public function show(Workspace $workspace, FileSnapshot $snapshot)
    {
        abort_unless($snapshot->workspace_id === $workspace->id, 403);

        return response()->json($snapshot);
    }

    public function restore(Workspace $workspace, FileSnapshot $snapshot)
    {
        abort_unless($snapshot->workspace_id === $workspace->id, 403);

        return response()->json([
            'content'   => $snapshot->content,
            'file_path' => $snapshot->file_path,
        ]);
    }
}
