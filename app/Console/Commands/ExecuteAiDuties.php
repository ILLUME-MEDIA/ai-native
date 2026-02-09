<?php

namespace App\Console\Commands;

use App\Models\AiDuty;
use App\Services\AI\DutyExecutionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ExecuteAiDuties extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ai:duties:execute {--duty= : ID of a specific duty to execute} {--all : Execute all active duties}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process and execute queued or scheduled AI duties';

    public function __construct(protected DutyExecutionService $executionService)
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dutyId = $this->option('duty');

        if ($dutyId) {
            $duty = AiDuty::find($dutyId);
            if (!$duty) {
                $this->error("Duty [{$dutyId}] not found.");
                return 1;
            }
            $this->executeDuty($duty);
            return 0;
        }

        $duties = AiDuty::getDueDuties();

        if ($duties->isEmpty()) {
            $this->info("No duties due for execution.");
            return 0;
        }

        $this->info("Found " . $duties->count() . " duties to execute.");

        foreach ($duties as $duty) {
            $this->executeDuty($duty);
        }

        return 0;
    }

    protected function executeDuty(AiDuty $duty)
    {
        $this->info("Executing duty: {$duty->name}...");
        Log::info("Artisan: Executing duty: {$duty->name}");

        try {
            $result = $this->executionService->execute($duty);
            $this->info("Duty [{$duty->name}] completed successfully.");
            $this->line(json_encode($result, JSON_PRETTY_PRINT));
        } catch (\Exception $e) {
            $this->error("Duty [{$duty->name}] failed: " . $e->getMessage());
        }
    }
}
