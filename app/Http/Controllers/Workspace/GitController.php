<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class GitController extends Controller
{
    use AuthorizesRequests;
    public function init(Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $result = $this->runGit($workspace, 'init');

        if ($result['success']) {
            $workspace->update(['git_enabled' => true]);
        }

        return response()->json($result);
    }

    public function status(Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        return response()->json($this->runGit($workspace, 'status', '--porcelain'));
    }

    public function add(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $files = $request->input('files', ['.']);

        return response()->json($this->runGit($workspace, 'add', ...$files));
    }

    public function commit(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $request->validate(['message' => 'required|string']);

        return response()->json($this->runGit($workspace, 'commit', '-m', $request->message));
    }

    public function push(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $branch = $request->input('branch', 'main');

        return response()->json($this->runGit($workspace, 'push', 'origin', $branch));
    }

    public function pull(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        return response()->json($this->runGit($workspace, 'pull'));
    }

    public function log(Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        return response()->json($this->runGit($workspace, 'log', '--oneline', '-20'));
    }

    public function diff(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $file = $request->input('file');

        $args = ['diff'];
        if ($file) {
            $args[] = $file;
        }

        return response()->json($this->runGit($workspace, ...$args));
    }

    protected function runGit(Workspace $workspace, ...$args)
    {
        $process = new Process(
            array_merge(['git'], $args),
            $workspace->full_path,
            null,
            null,
            60
        );

        try {
            $process->run();

            return [
                'success' => $process->isSuccessful(),
                'output' => $process->getOutput(),
                'error' => $process->getErrorOutput()
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
