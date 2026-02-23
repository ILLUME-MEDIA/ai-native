<?php

namespace App\Services\AI;

use App\Models\AITask;
use App\Models\AITaskList;

class AIOrchestrator
{
    /**
     * Trigger words that suggest a complex, multi-step task requiring planning.
     */
    private const PLANNING_TRIGGERS = [
        'build', 'create a full', 'implement', 'set up', 'develop a',
        'make a complete', 'add a feature', 'refactor', 'redesign',
        'build out', 'integrate', 'scaffold', 'generate a', 'write a full',
    ];

    /**
     * Classify the user message to determine if planning or clarification is needed.
     *
     * Returns:
     *   needs_planning (bool) — true if the message seems multi-step
     *   is_vague       (bool) — true if the message is too short to act on
     */
    public function classify(string $message): array
    {
        $lower = strtolower(trim($message));
        $wordCount = str_word_count($lower);

        $needsPlanning = false;
        foreach (self::PLANNING_TRIGGERS as $trigger) {
            if (str_contains($lower, $trigger)) {
                $needsPlanning = true;
                break;
            }
        }

        $isVague = $wordCount < 4;

        return [
            'needs_planning' => $needsPlanning,
            'is_vague'       => $isVague,
        ];
    }

    /**
     * Build an addendum to inject into the system prompt when orchestration is active.
     * The AI uses these prefixes to signal structured output.
     */
    public function getOrchestratorSystemAddendum(bool $needsPlanning, bool $isVague): string
    {
        $lines = [];

        if ($isVague) {
            $lines[] = <<<'TEXT'
## CLARIFICATION PROTOCOL
If you need more information before acting, output ONLY the following JSON on the very first line of your response (no other text before it):
CLARIFY:{"questions":[{"id":"q1","text":"<question text>","options":["<opt1>","<opt2>","<opt3>"]},{"id":"q2","text":"<question text>","options":["<opt1>","<opt2>"]}]}

Rules:
- Provide 2-4 short, focused questions maximum.
- Each question must have 2-4 options. Users may also type a custom answer.
- Only use CLARIFY: if you genuinely cannot proceed without more information.
- After the CLARIFY: line, do not add any other text.
TEXT;
        }

        if ($needsPlanning) {
            $lines[] = <<<'TEXT'
## PLANNING PROTOCOL
For complex, multi-step tasks, output ONLY the following JSON on the very first line of your response (no other text before it):
PLAN:{"tasks":[{"title":"<short title>","description":"<what you will do>"},{"title":"<short title>","description":"<what you will do>"}]}

Rules:
- List 2-8 concrete tasks. Keep titles short (< 60 chars).
- Only use PLAN: for tasks that genuinely require multiple steps (e.g. create files, run migrations, configure routes).
- After the PLAN: line, immediately begin executing the first task. Do not wait for confirmation.
- As you complete each task, briefly indicate it (e.g. "✓ Created UserController").
TEXT;
        }

        return implode("\n\n", $lines);
    }

    /**
     * Detect and parse a CLARIFY: prefix from the first buffered chunk.
     * Returns parsed data or null if not present.
     */
    public function parseClarifyPrefix(string $buffer): ?array
    {
        $firstLine = strtok($buffer, "\n");
        if (!$firstLine || !str_starts_with($firstLine, 'CLARIFY:')) {
            return null;
        }

        $json = substr($firstLine, strlen('CLARIFY:'));
        $data = json_decode($json, true);

        if (!is_array($data) || !isset($data['questions'])) {
            return null;
        }

        return $data;
    }

    /**
     * Detect and parse a PLAN: prefix from the first buffered chunk.
     * Returns parsed data or null if not present.
     */
    public function parsePlanPrefix(string $buffer): ?array
    {
        $firstLine = strtok($buffer, "\n");
        if (!$firstLine || !str_starts_with($firstLine, 'PLAN:')) {
            return null;
        }

        $json = substr($firstLine, strlen('PLAN:'));
        $data = json_decode($json, true);

        if (!is_array($data) || !isset($data['tasks'])) {
            return null;
        }

        return $data;
    }

    /**
     * Create a new task list with tasks for a conversation.
     */
    public function createTaskList(int $conversationId, array $tasks): AITaskList
    {
        $taskList = AITaskList::create([
            'conversation_id' => $conversationId,
            'status'          => 'in_progress',
        ]);

        foreach ($tasks as $i => $task) {
            AITask::create([
                'task_list_id' => $taskList->id,
                'order'        => $i,
                'title'        => $task['title'] ?? "Task " . ($i + 1),
                'description'  => $task['description'] ?? null,
                'status'       => 'pending',
            ]);
        }

        return $taskList->load('tasks');
    }

    /**
     * Get the most recent incomplete task list for a conversation (for auto-resume).
     */
    public function getIncompleteTaskList(int $conversationId): ?AITaskList
    {
        return AITaskList::where('conversation_id', $conversationId)
            ->whereIn('status', ['pending', 'in_progress'])
            ->latest()
            ->with('tasks')
            ->first();
    }

    public function startTask(AITask $task): void
    {
        $task->update(['status' => 'in_progress']);
    }

    public function completeTask(AITask $task, ?array $result = null): void
    {
        $task->update(['status' => 'completed', 'result' => $result]);
    }

    public function failTask(AITask $task, string $error): void
    {
        $task->update(['status' => 'failed', 'result' => ['error' => $error]]);
    }

    public function completeTaskList(AITaskList $taskList): void
    {
        $taskList->update(['status' => 'completed']);
    }
}
