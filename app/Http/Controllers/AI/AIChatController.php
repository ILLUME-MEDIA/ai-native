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
}
