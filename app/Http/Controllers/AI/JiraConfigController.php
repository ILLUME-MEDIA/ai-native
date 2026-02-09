<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\JiraConfig;
use Illuminate\Http\Request;

class JiraConfigController extends Controller
{
    public function show()
    {
        return response()->json(JiraConfig::first() ?? new JiraConfig());
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'domain' => 'required|string',
            'email' => 'required|email',
            'api_token' => 'required|string',
            'default_project_key' => 'required|string',
        ]);

        $config = JiraConfig::first() ?: new JiraConfig();
        $config->fill($validated);
        $config->save();

        return response()->json($config);
    }
}
