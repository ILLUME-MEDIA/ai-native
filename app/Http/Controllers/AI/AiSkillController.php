<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\AiSkill;
use Illuminate\Http\Request;

class AiSkillController extends Controller
{
    public function index()
    {
        return response()->json(
            AiSkill::query()
                ->select(['id', 'name', 'description', 'is_active', 'priority', 'created_at'])
                ->orderBy('priority', 'desc')
                ->limit(200)
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:ai_skills',
            'description' => 'required|string',
            'instructions' => 'required|string',
            'allowed_tools' => 'nullable|array',
            'trigger_keywords' => 'nullable|array',
            'is_active' => 'boolean',
            'priority' => 'integer',
        ]);

        $skill = AiSkill::create($validated);
        return response()->json($skill, 201);
    }

    public function show(AiSkill $skill)
    {
        return response()->json($skill);
    }

    public function update(Request $request, AiSkill $skill)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|unique:ai_skills,name,' . $skill->id,
            'description' => 'sometimes|string',
            'instructions' => 'sometimes|string',
            'allowed_tools' => 'nullable|array',
            'trigger_keywords' => 'nullable|array',
            'is_active' => 'boolean',
            'priority' => 'integer',
        ]);

        $skill->update($validated);
        return response()->json($skill);
    }

    public function destroy(AiSkill $skill)
    {
        $skill->delete();
        return response()->noContent();
    }
}
