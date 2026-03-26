<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\SnippetTemplate;
use App\Models\Workspace;
use Illuminate\Http\Request;

class SnippetController extends Controller
{
    public function index(Workspace $workspace)
    {
        return response()->json(
            SnippetTemplate::where('workspace_id', $workspace->id)
                ->orderBy('language')
                ->orderBy('trigger')
                ->get()
        );
    }

    public function store(Request $request, Workspace $workspace)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'trigger'     => 'required|string|max:50',
            'language'    => 'required|string|max:50',
            'body'        => 'required|string',
            'description' => 'nullable|string|max:255',
        ]);

        $snippet = SnippetTemplate::create([
            'workspace_id' => $workspace->id,
            'user_id'      => auth()->id(),
            ...$data,
        ]);

        return response()->json($snippet, 201);
    }

    public function update(Request $request, Workspace $workspace, SnippetTemplate $snippet)
    {
        abort_unless($snippet->workspace_id === $workspace->id, 403);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'trigger'     => 'sometimes|string|max:50',
            'language'    => 'sometimes|string|max:50',
            'body'        => 'sometimes|string',
            'description' => 'nullable|string|max:255',
        ]);

        $snippet->update($data);

        return response()->json($snippet);
    }

    public function destroy(Workspace $workspace, SnippetTemplate $snippet)
    {
        abort_unless($snippet->workspace_id === $workspace->id, 403);

        $snippet->delete();

        return response()->json(null, 204);
    }
}
