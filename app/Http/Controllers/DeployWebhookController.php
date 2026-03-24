<?php

namespace App\Http\Controllers;

use App\Jobs\RunDeployJob;
use App\Models\DeployLog;
use App\Models\DeployProject;
use Illuminate\Http\Request;

class DeployWebhookController extends Controller
{
    /**
     * POST /api/deploy/webhook/{projectId}/{secret}
     * Called by GitHub webhook on every push.
     */
    public function handle(Request $request, $projectId, $secret)
    {
        $project = DeployProject::find($projectId);

        // Validate project + secret
        if (!$project || !hash_equals($project->webhook_secret ?? '', $secret)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Verify GitHub HMAC-SHA256 signature (if GitHub sends it)
        $hubSig = $request->header('X-Hub-Signature-256');
        if ($hubSig) {
            $expected = 'sha256=' . hash_hmac('sha256', $request->getContent(), $secret);
            if (!hash_equals($expected, $hubSig)) {
                return response()->json(['error' => 'Signature mismatch'], 401);
            }
        }

        $payload = $request->json()->all();
        $pushedBranch = last(explode('/', $payload['ref'] ?? ''));

        // Only deploy if pushed branch matches configured branch
        if ($pushedBranch && $pushedBranch !== $project->branch) {
            return response()->json(['skipped' => "Branch {$pushedBranch} not tracked."]);
        }

        // If auto_deploy is off — just acknowledge, don't deploy
        if (!$project->auto_deploy) {
            return response()->json(['skipped' => 'Auto-deploy is disabled for this project.']);
        }

        // Prevent concurrent deploys
        if ($project->status === 'deploying') {
            return response()->json(['skipped' => 'Already deploying.']);
        }

        $commit      = $payload['head_commit'] ?? [];
        $commitHash  = $commit['id'] ?? null;
        $commitMsg   = $commit['message'] ?? null;

        $log = DeployLog::create([
            'project_id'     => $project->id,
            'status'         => 'pending',
            'branch'         => $project->branch,
            'triggered_by'   => 'webhook',
            'commit_hash'    => $commitHash ? substr($commitHash, 0, 40) : null,
            'commit_message' => $commitMsg ? substr($commitMsg, 0, 255) : null,
        ]);

        $project->update(['status' => 'deploying']);

        RunDeployJob::dispatch($project->id, $log->id);

        return response()->json(['queued' => true, 'log_id' => $log->id]);
    }
}
