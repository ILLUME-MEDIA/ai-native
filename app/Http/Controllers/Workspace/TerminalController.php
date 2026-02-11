<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class TerminalController extends Controller
{
    use AuthorizesRequests;
    public function execute(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate([
            'command' => 'required|string',
            'requires_approval' => 'boolean'
        ]);

        $command = $request->command;

        // Check if command requires approval
        if ($this->requiresApproval($command) && !$request->boolean('approved')) {
            return response()->json([
                'requires_approval' => true,
                'command' => $command,
                'message' => 'This command requires approval'
            ]);
        }

        $process = new Process(
            explode(' ', $command),
            $workspace->full_path,
            null,
            null,
            300 // 5 minute timeout
        );

        try {
            $process->run();

            return response()->json([
                'success' => $process->isSuccessful(),
                'output' => $process->getOutput(),
                'error' => $process->getErrorOutput(),
                'exit_code' => $process->getExitCode()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    protected function requiresApproval(string $command): bool
    {
        $dangerous = ['rm', 'del', 'format', 'mkfs', 'dd', '>', 'sudo', 'chmod 777'];

        foreach ($dangerous as $pattern) {
            if (str_contains($command, $pattern)) {
                return true;
            }
        }

        return false;
    }
}
