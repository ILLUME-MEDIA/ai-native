<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\AIManager;
use Illuminate\Http\Request;

class AIChatController extends Controller
{
    public function __construct(protected AIManager $aiManager)
    {
    }

    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'endpoint_id' => 'nullable|integer|exists:ai_endpoints,id',
            'model' => 'nullable|string',
        ]);

        try {
            $result = $this->aiManager->execute($request->message, [
                'mode' => 'chat',
                'endpoint_id' => $request->endpoint_id,
                'model' => $request->model,
            ]);
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function auditLogs()
    {
        return response()->json(\App\Models\AIAuditLog::latest()->take(50)->get());
    }

    /**
     * Chat with code editor context
     */
    public function editorChat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'endpoint_id' => 'nullable|exists:ai_endpoints,id',
            'model_id' => 'nullable|string',
            'current_file' => 'nullable|array',
            'current_file.path' => 'required_with:current_file|string',
            'current_file.content' => 'required_with:current_file|string',
            'current_file.language' => 'nullable|string',
            'open_files' => 'nullable|array',
            'open_files.*.path' => 'required|string',
            'open_files.*.content' => 'nullable|string',
            'open_files.*.language' => 'nullable|string',
        ]);

        try {
            $result = $this->aiManager->chatWithCode($request->all());

            // Log to audit
            \App\Models\AIAuditLog::create([
                'action' => 'editor_chat',
                'model' => $result['model_used'] ?? 'unknown',
                'provider' => $result['provider'] ?? 'unknown',
                'result' => 'success',
                'payload' => [
                    'file_path' => $request->input('current_file.path'),
                    'has_code_changes' => !empty($result['code_changes']),
                    'code_changes_count' => count($result['code_changes'] ?? [])
                ],
            ]);

            return response()->json($result);

        } catch (\Exception $e) {
            // Log error
            \App\Models\AIAuditLog::create([
                'action' => 'editor_chat',
                'model' => $request->input('model_id', 'AUTO'),
                'provider' => 'unknown',
                'result' => 'failure',
                'payload' => [
                    'error' => $e->getMessage()
                ],
            ]);

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
