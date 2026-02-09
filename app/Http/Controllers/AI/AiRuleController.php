<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\AiRule;
use Illuminate\Http\Request;

class AiRuleController extends Controller
{
    public function index()
    {
        return response()->json(
            AiRule::query()
                ->select(['id', 'name', 'description', 'type', 'is_active', 'priority', 'created_at'])
                ->orderBy('priority', 'desc')
                ->limit(200)
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
            'rule_content' => 'required|string',
            'type' => 'required|string',
            'is_active' => 'boolean',
            'priority' => 'integer',
            'conditions' => 'nullable|array',
        ]);

        $rule = AiRule::create($validated);
        return response()->json($rule, 201);
    }

    public function show(AiRule $rule)
    {
        return response()->json($rule);
    }

    public function update(Request $request, AiRule $rule)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'description' => 'nullable|string',
            'rule_content' => 'sometimes|string',
            'type' => 'sometimes|string',
            'is_active' => 'boolean',
            'priority' => 'integer',
            'conditions' => 'nullable|array',
        ]);

        $rule->update($validated);
        return response()->json($rule);
    }

    public function destroy(AiRule $rule)
    {
        $rule->delete();
        return response()->noContent();
    }
}
