<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use App\Services\AI\AIManager;
use App\Services\Git\GitService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class AICommitController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private AIManager $aiManager,
        private GitService $gitService,
    ) {}

    /**
     * E-02: Generate a conventional commit message from the workspace diff.
     * Prefers staged diff; falls back to all unstaged changes.
     */
    public function generate(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        if (!is_dir($workspace->full_path)) {
            return response()->json(['error' => 'Workspace directory not found'], 404);
        }

        // Try staged diff first
        $staged = $this->gitService->execute($workspace->full_path, ['diff', '--cached']);
        $diff   = trim($staged['output'] ?? '');

        // Fall back to unstaged diff
        if ($diff === '') {
            $unstaged = $this->gitService->execute($workspace->full_path, ['diff']);
            $diff     = trim($unstaged['output'] ?? '');
        }

        if ($diff === '') {
            return response()->json(['message' => '', 'hint' => 'No changes to summarise']);
        }

        // Cap diff at 8 KB to stay within token budget
        $diff = mb_substr($diff, 0, 8000);

        $prompt = <<<EOT
Generate a conventional commit message for the following git diff.

Format requirements:
- First line: <type>(<optional-scope>): <short description>
  - Max 72 characters, all lowercase, no period at end
  - Types: feat, fix, refactor, docs, style, test, chore, perf, ci, build
- Optionally add a blank line then 2-5 bullet points summarising the key changes
- Return ONLY the commit message text — no explanations, no markdown fences, no extra commentary

Git diff:
{$diff}
EOT;

        try {
            $result  = $this->aiManager->chatWithCode([
                'message'     => $prompt,
                'endpoint_id' => null,
                'model_id'    => 'AUTO',
                'ui_target'   => 'ask',
                'workspace'   => $workspace,
                'open_files'  => [],
            ]);

            $message = trim($result['text'] ?? '');

            // Strip accidental markdown fences
            $message = preg_replace('/^```[a-z]*\n?/im', '', $message);
            $message = preg_replace('/\n?```$/im', '', $message);
            $message = trim($message);

            return response()->json(['message' => $message]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
