<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use App\Models\WorkspaceRunConfig;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class RunConfigController extends Controller
{
    public function index(Workspace $workspace)
    {
        return response()->json(
            WorkspaceRunConfig::where('workspace_id', $workspace->id)
                ->orderBy('created_at')
                ->get()
        );
    }

    public function store(Request $request, Workspace $workspace)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:100',
            'command' => 'required|string|max:2000',
            'cwd'     => 'nullable|string|max:500',
            'color'   => 'nullable|string|max:20',
        ]);

        $config = WorkspaceRunConfig::create([
            'workspace_id' => $workspace->id,
            ...$data,
        ]);

        return response()->json($config, 201);
    }

    public function update(Request $request, Workspace $workspace, WorkspaceRunConfig $runConfig)
    {
        abort_unless($runConfig->workspace_id === $workspace->id, 403);

        $data = $request->validate([
            'name'    => 'sometimes|string|max:100',
            'command' => 'sometimes|string|max:2000',
            'cwd'     => 'nullable|string|max:500',
            'color'   => 'nullable|string|max:20',
        ]);

        $runConfig->update($data);

        return response()->json($runConfig);
    }

    public function destroy(Workspace $workspace, WorkspaceRunConfig $runConfig)
    {
        abort_unless($runConfig->workspace_id === $workspace->id, 403);

        $runConfig->delete();

        return response()->json(null, 204);
    }

    /**
     * Execute a run configuration and stream output via SSE.
     */
    public function execute(Request $request, Workspace $workspace, WorkspaceRunConfig $runConfig)
    {
        abort_unless($runConfig->workspace_id === $workspace->id, 403);

        set_time_limit(0);
        ignore_user_abort(false);

        $rootPath  = str_replace('\\', '/', $workspace->full_path);
        $cwd       = $runConfig->cwd
            ? $rootPath . '/' . ltrim(str_replace('\\', '/', $runConfig->cwd), '/')
            : $rootPath;
        $command   = $runConfig->command;

        return response()->stream(function () use ($command, $cwd) {
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no');

            $sendSSE = function (string $event, array $data) {
                echo "event: {$event}\n";
                echo 'data: ' . json_encode($data) . "\n\n";
                if (ob_get_level()) ob_flush();
                flush();
            };

            $sendSSE('started', ['command' => $command, 'cwd' => $cwd]);

            $process = Process::fromShellCommandline($command, $cwd, null, null, 120);
            $process->start();

            foreach ($process as $type => $chunk) {
                if (connection_aborted()) {
                    $process->stop();
                    break;
                }
                $event = ($type === Process::ERR) ? 'stderr' : 'stdout';
                $sendSSE($event, ['text' => $chunk]);
            }

            $sendSSE('done', ['exit_code' => $process->getExitCode()]);
        }, 200, [
            'Content-Type'  => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
