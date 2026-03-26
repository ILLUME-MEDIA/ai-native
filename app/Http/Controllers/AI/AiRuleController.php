<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\AiRule;
use App\Models\Workspace;
use Illuminate\Http\Request;

class AiRuleController extends Controller
{
    // ── Global (user-scoped) rules ────────────────────────────────────────────

    public function index()
    {
        return response()->json(
            AiRule::query()
                ->select(['id', 'user_id', 'workspace_id', 'name', 'description', 'type', 'is_active', 'priority', 'created_at'])
                ->where('user_id', auth()->id())
                ->whereNull('workspace_id')
                ->orderBy('priority', 'desc')
                ->limit(200)
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string',
            'description' => 'nullable|string',
            'rule_content' => 'required|string',
            'type'        => 'required|string',
            'is_active'   => 'boolean',
            'priority'    => 'integer',
            'conditions'  => 'nullable|array',
        ]);

        $validated['user_id']      = auth()->id();
        $validated['workspace_id'] = null;

        $rule = AiRule::create($validated);
        return response()->json($rule, 201);
    }

    public function show(AiRule $rule)
    {
        abort_unless($rule->user_id === auth()->id() || is_null($rule->user_id), 403);
        return response()->json($rule);
    }

    public function update(Request $request, AiRule $rule)
    {
        abort_unless($rule->user_id === auth()->id(), 403);

        $validated = $request->validate([
            'name'        => 'sometimes|string',
            'description' => 'nullable|string',
            'rule_content' => 'sometimes|string',
            'type'        => 'sometimes|string',
            'is_active'   => 'boolean',
            'priority'    => 'integer',
            'conditions'  => 'nullable|array',
        ]);

        $rule->update($validated);
        return response()->json($rule);
    }

    public function destroy(AiRule $rule)
    {
        abort_unless($rule->user_id === auth()->id(), 403);
        $rule->delete();
        return response()->noContent();
    }

    // ── Workspace-scoped rules ────────────────────────────────────────────────

    public function workspaceIndex(Workspace $workspace)
    {
        return response()->json(
            AiRule::where('user_id', auth()->id())
                ->where('workspace_id', $workspace->id)
                ->orderBy('priority', 'desc')
                ->get()
        );
    }

    public function workspaceStore(Request $request, Workspace $workspace)
    {
        $validated = $request->validate([
            'name'        => 'required|string',
            'description' => 'nullable|string',
            'rule_content' => 'required|string',
            'type'        => 'required|string',
            'is_active'   => 'boolean',
            'priority'    => 'integer',
            'conditions'  => 'nullable|array',
        ]);

        $validated['user_id']      = auth()->id();
        $validated['workspace_id'] = $workspace->id;

        $rule = AiRule::create($validated);
        return response()->json($rule, 201);
    }

    // ── .airules file (project-level, git-committed) ──────────────────────────

    public function getRulesFile(Workspace $workspace)
    {
        $filePath = rtrim($workspace->full_path, '/\\') . '/.airules';
        $content  = file_exists($filePath) ? file_get_contents($filePath) : '';

        return response()->json(['content' => $content]);
    }

    public function putRulesFile(Request $request, Workspace $workspace)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:50000',
        ]);

        $filePath = rtrim($workspace->full_path, '/\\') . '/.airules';

        // Ensure workspace directory exists
        if (!is_dir(dirname($filePath))) {
            return response()->json(['error' => 'Workspace directory not found'], 404);
        }

        file_put_contents($filePath, $validated['content']);

        return response()->json(['saved' => true]);
    }
}
