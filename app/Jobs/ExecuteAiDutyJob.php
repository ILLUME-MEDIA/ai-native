<?php

namespace App\Jobs;

use App\Models\AiDuty;
use App\Services\AI\DutyExecutionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ExecuteAiDutyJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(protected AiDuty $duty)
    {
    }

    /**
     * Execute the job.
     */
    public function handle(DutyExecutionService $executionService): void
    {
        Log::info("Executing background duty: {$this->duty->name}");

        try {
            $executionService->execute($this->duty);
        } catch (\Exception $e) {
            Log::error("Job failed for duty [{$this->duty->name}]: " . $e->getMessage());
            // Optionally retry or handle failure
        }
    }
}
