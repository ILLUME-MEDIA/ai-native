<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\AIConversation;
use App\Models\AIConversationEvent;
use App\Models\Workspace;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class AIConversationController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $limit = (int) $request->input('limit', 20);
        $limit = max(1, min($limit, 50));

        $items = AIConversation::query()
            ->where('workspace_id', $workspace->id)
            ->where('user_id', auth()->id())
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get([
                'id',
                'workspace_id',
                'user_id',
                'title',
                'endpoint_id',
                'model_id',
                'last_activity_at',
                'created_at',
            ]);

        return response()->json(['conversations' => $items]);
    }

    public function store(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $data = $request->validate([
            'title' => 'nullable|string|max:255',
            'endpoint_id' => 'nullable|exists:ai_endpoints,id',
            'model_id' => 'nullable|string|max:255',
        ]);

        $conversation = AIConversation::create([
            'workspace_id' => $workspace->id,
            'user_id' => auth()->id(),
            'title' => $data['title'] ?? null,
            'endpoint_id' => $data['endpoint_id'] ?? null,
            'model_id' => $data['model_id'] ?? null,
            'last_activity_at' => now(),
        ]);

        return response()->json(['conversation' => $conversation], 201);
    }

    public function show(Request $request, Workspace $workspace, AIConversation $conversation)
    {
        $this->authorize('view', $workspace);

        if ($conversation->workspace_id !== $workspace->id || $conversation->user_id !== auth()->id()) {
            abort(404);
        }

        $limit = (int) $request->input('limit', 500);
        $limit = max(1, min($limit, 2000));
        $afterId = (int) $request->input('after_id', 0);

        $eventsQuery = AIConversationEvent::query()
            ->where('conversation_id', $conversation->id)
            ->orderBy('id');

        if ($afterId > 0) {
            $eventsQuery->where('id', '>', $afterId);
        }

        $events = $eventsQuery->limit($limit)->get(['id', 'type', 'payload', 'created_at']);

        return response()->json([
            'conversation' => $conversation,
            'events' => $events,
        ]);
    }

    public function cancel(Request $request, Workspace $workspace, AIConversation $conversation)
    {
        $this->authorize('update', $workspace);

        if ($conversation->workspace_id !== $workspace->id || $conversation->user_id !== auth()->id()) {
            abort(404);
        }

        cache()->put("ai_cancel:conversation:{$conversation->id}", true, now()->addMinutes(10));

        AIConversationEvent::create([
            'conversation_id' => $conversation->id,
            'type' => 'cancel_requested',
            'payload' => [
                'by_user_id' => auth()->id(),
                'reason' => (string) ($request->input('reason') ?? ''),
            ],
        ]);

        $conversation->update(['last_activity_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function destroy(Request $request, Workspace $workspace, AIConversation $conversation)
    {
        $this->authorize('update', $workspace);

        if ($conversation->workspace_id !== $workspace->id || $conversation->user_id !== auth()->id()) {
            abort(404);
        }

        $conversation->delete();

        return response()->json(['success' => true]);
    }
}

