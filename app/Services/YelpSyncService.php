<?php

namespace App\Services;

use App\Models\SectionEntity;
use App\Models\SectionField;
use App\Models\YelpAccount;
use App\Models\YelpJob;
use App\Models\YelpJobLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class YelpSyncService
{
    /**
     * Run a Yelp sync job.
     *
     * ── What "permanently closed" means ──────────────────────────────────────
     * Yelp's search result `is_closed` is NOT reliable for permanent closure —
     * it can return true during off-hours on some responses.
     * We ALWAYS fetch the business Details endpoint and use details.is_closed
     * which is the authoritative "business has gone out of business" flag.
     *
     * ── yelp_verified column ─────────────────────────────────────────────────
     * A `yelp_verified` (boolean) column is auto-created in the target table
     * when the job first runs.
     *   1 = row was successfully checked/updated by Yelp
     *   0 = not yet processed, not found, or failed
     *
     * ── Resume support ───────────────────────────────────────────────────────
     * `yelp_jobs.last_processed_id` stores the last row ID that was processed.
     * On next run, processing starts from WHERE id > last_processed_id.
     * When all rows are done, last_processed_id resets to 0 for next full cycle.
     *
     * ── Per-run call limit ───────────────────────────────────────────────────
     * `yelp_jobs.max_calls_per_run` (0 = unlimited) caps how many API calls
     * are made in a single cron execution. Each row costs 2 calls.
     * When the limit is hit, job pauses and resumes next cron run from where
     * it stopped (via last_processed_id).
     *
     * Modes:
     *   smart       – Get details for every row (2 calls).
     *                 If permanently_closed = true  → ONLY update that column.
     *                 If permanently_closed = false → update ALL mapped columns.
     *   full        – Same as smart.
     *   verify_only – Only check permanent closure status, nothing else.
     */
    public function run(YelpJob $job, YelpJobLog $log): void
    {
        $log->update(['status' => 'running', 'started_at' => now()]);

        $entity = $job->entity;
        if (!$entity) {
            $log->update(['status' => 'failed', 'error_message' => 'Entity not found.', 'completed_at' => now()]);
            return;
        }

        $tableName    = $entity->table_name;
        $searchCols   = $job->search_columns;
        $columnMap    = $job->column_mapping;
        $mode         = $job->mode ?? 'smart';
        $resumeFromId = (int) ($job->last_processed_id ?? 0);
        $maxCalls     = (int) ($job->max_calls_per_run ?? 0); // 0 = unlimited

        if (!Schema::hasTable($tableName)) {
            $log->update(['status' => 'failed', 'error_message' => "Table `{$tableName}` not found.", 'completed_at' => now()]);
            return;
        }

        // ── Auto-create yelp_verified column in target table ──────────────────
        $this->ensureYelpVerifiedColumn($entity, $tableName);

        // ── permanently_closed column in target table (if mapped) ────────────
        $permClosedCol = $columnMap['permanently_closed'] ?? null;

        // Count only rows that are NOT already permanently closed
        $countQ = DB::table($tableName);
        if ($permClosedCol && Schema::hasColumn($tableName, $permClosedCol)) {
            $countQ->where(function ($q) use ($permClosedCol) {
                $q->whereNull($permClosedCol)
                  ->orWhere($permClosedCol, false)
                  ->orWhere($permClosedCol, 0);
            });
        }
        $total = $countQ->count();
        $log->update(['total_rows' => $total]);

        if ($total === 0) {
            $log->update(['status' => 'completed', 'completed_at' => now()]);
            $job->update(['last_run_at' => now(), 'last_processed_id' => 0]);
            $job->updateNextRunAt();
            return;
        }

        $newColumnsAdded = [];
        $processed       = 0;
        $failed          = 0;
        $skipped         = 0;
        $closedRows      = 0;
        $notFoundRows    = 0;
        $account         = null;
        $stopped         = false;
        $limitHit        = false;
        $callsMade       = 0;
        $lastProcessedId = $resumeFromId;

        // Only process rows that are NOT already permanently closed
        $baseQuery = DB::table($tableName)->where('id', '>', $resumeFromId);
        if ($permClosedCol && Schema::hasColumn($tableName, $permClosedCol)) {
            $baseQuery->where(function ($q) use ($permClosedCol) {
                $q->whereNull($permClosedCol)
                  ->orWhere($permClosedCol, false)
                  ->orWhere($permClosedCol, 0);
            });
        }

        $baseQuery->orderBy('id')->chunk(50, function ($rows) use (
            $tableName, $searchCols, $columnMap, $entity, $mode,
            $maxCalls, &$callsMade, &$lastProcessedId,
            &$processed, &$failed, &$skipped, &$closedRows, &$notFoundRows,
            &$newColumnsAdded, &$account, &$stopped, &$limitHit, $log
        ) {
                foreach ($rows as $row) {
                    // Check stop signal from UI
                    if ($log->isStopRequested()) {
                        $stopped = true;
                        return false;
                    }

                    // Check per-run call limit (each row costs 2 API calls)
                    if ($maxCalls > 0 && ($callsMade + 2) > $maxCalls) {
                        $limitHit = true;
                        return false;
                    }

                    // Pick account with quota
                    $account = $this->pickAccount();
                    if (!$account) {
                        $log->update([
                            'status'         => 'paused',
                            'error_message'  => 'All Yelp accounts exhausted for today. Resume tomorrow.',
                            'processed_rows' => $processed,
                            'failed_rows'    => $failed,
                            'skipped_rows'   => $skipped,
                            'closed_rows'    => $closedRows,
                            'not_found_rows' => $notFoundRows,
                            'completed_at'   => now(),
                        ]);
                        return false;
                    }

                    $rowArr   = (array) $row;
                    $rowId    = $rowArr['id'] ?? null;
                    $term     = $this->colValue($rowArr, $searchCols['term'] ?? null);
                    $address  = $this->colValue($rowArr, $searchCols['address'] ?? null);
                    $city     = $this->colValue($rowArr, $searchCols['city'] ?? null);
                    $state    = $this->colValue($rowArr, $searchCols['state'] ?? null);
                    $zip      = $this->colValue($rowArr, $searchCols['zip'] ?? null);

                    $location = implode(', ', array_filter([$address, $city, $state, $zip]));

                    if (!$term) {
                        $skipped++;
                        if ($rowId) $lastProcessedId = $rowId;
                        if (($skipped % 10) === 0) {
                            $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                        }
                        continue;
                    }

                    $yelp = new YelpService($account->api_key);

                    // ── STEP 1: Search to find the Yelp business ID ───────────
                    $match = $yelp->searchBusiness($term, $location);
                    $account->incrementUsage();
                    $callsMade++;

                    if (!$match) {
                        $notFoundRows++;
                        if ($rowId) {
                            DB::table($tableName)->where('id', $rowId)->update(['yelp_verified' => 0]);
                            $lastProcessedId = $rowId;
                        }
                        $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                        usleep(300000);
                        continue;
                    }

                    // ── STEP 2: Fetch Details (ONLY reliable source for ───────
                    // permanent closure — never use search result is_closed)
                    $details = $yelp->getBusiness($match['id']);
                    $account->incrementUsage();
                    $callsMade++;

                    if (!$details) {
                        $failed++;
                        if ($rowId) {
                            DB::table($tableName)->where('id', $rowId)->update(['yelp_verified' => 0]);
                            $lastProcessedId = $rowId;
                        }
                        $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                        usleep(300000);
                        continue;
                    }

                    // ── STEP 3: Check PERMANENT closure from details ──────────
                    $permanentlyClosed = (bool) ($details['is_closed'] ?? false);
                    $extracted         = $yelp->extractFields($details);

                    if ($permanentlyClosed) {
                        $this->updatePermanentlyClosedColumn(
                            $entity, $tableName, $columnMap, $rowArr, $newColumnsAdded, true
                        );
                        // Verified = 1 (we checked it; it's permanently closed)
                        if ($rowId) {
                            DB::table($tableName)->where('id', $rowId)->update(['yelp_verified' => 1]);
                            $lastProcessedId = $rowId;
                        }
                        $closedRows++;
                        $processed++;
                        $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                        usleep(300000);
                        continue;
                    }

                    // ── STEP 4: Business is STILL OPERATING ──────────────────
                    if ($mode === 'verify_only') {
                        $this->updatePermanentlyClosedColumn(
                            $entity, $tableName, $columnMap, $rowArr, $newColumnsAdded, false
                        );
                        if ($rowId) {
                            DB::table($tableName)->where('id', $rowId)->update(['yelp_verified' => 1]);
                            $lastProcessedId = $rowId;
                        }
                        $processed++;
                        $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                        usleep(300000);
                        continue;
                    }

                    // ── STEP 5: Update ALL mapped columns ────────────────────
                    $updates = [];
                    foreach ($columnMap as $yelpField => $dbColumn) {
                        if (!array_key_exists($yelpField, $extracted)) {
                            continue;
                        }
                        if (!Schema::hasColumn($tableName, $dbColumn)) {
                            $this->addColumn($entity, $tableName, $dbColumn, $yelpField);
                            $newColumnsAdded[] = $dbColumn;
                        }
                        $updates[$dbColumn] = $extracted[$yelpField];
                    }

                    if (!empty($updates) && $rowId) {
                        $updates['yelp_verified'] = 1; // mark as verified
                        DB::table($tableName)->where('id', $rowId)->update($updates);
                        $lastProcessedId = $rowId;
                        $processed++;
                    } else {
                        if ($rowId) {
                            DB::table($tableName)->where('id', $rowId)->update(['yelp_verified' => 0]);
                            $lastProcessedId = $rowId;
                        }
                        $skipped++;
                    }

                    $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                    usleep(500000);
                }
            });

        // ── Determine final status ────────────────────────────────────────────
        $freshLog    = $log->fresh();
        $finalStatus = 'completed';
        if ($stopped) {
            $finalStatus = 'stopped';
        } elseif ($limitHit) {
            // Paused due to per-run limit — will resume next cron run
            $finalStatus = 'paused';
        } elseif ($freshLog->status === 'paused') {
            $finalStatus = 'paused';
        }

        // Save resume position:
        //  - completed → reset to 0 (next full cycle starts from beginning)
        //  - stopped/paused/limit_hit → save last ID so next run continues
        $nextResumeId = ($finalStatus === 'completed') ? 0 : $lastProcessedId;

        $log->update([
            'status'            => $finalStatus,
            'processed_rows'    => $processed,
            'failed_rows'       => $failed,
            'skipped_rows'      => $skipped,
            'closed_rows'       => $closedRows,
            'not_found_rows'    => $notFoundRows,
            'new_columns_added' => array_values(array_unique($newColumnsAdded)),
            'account_id'        => $account?->id,
            'completed_at'      => now(),
        ]);

        $job->update(['last_processed_id' => $nextResumeId]);

        if ($finalStatus === 'completed') {
            $job->update(['last_run_at' => now()]);
            $job->updateNextRunAt();
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Auto-create `yelp_verified` boolean column in the target table.
     * Registered in section_fields so it appears in Section Builder.
     */
    protected function ensureYelpVerifiedColumn(SectionEntity $entity, string $tableName): void
    {
        if (Schema::hasColumn($tableName, 'yelp_verified')) {
            return;
        }

        // Disable strict mode for this session so that existing columns with
        // legacy defaults (e.g. start_date '0000-00-00') don't block ALTER TABLE.
        DB::statement("SET SESSION sql_mode = ''");

        Schema::table($tableName, function (Blueprint $table) {
            $table->boolean('yelp_verified')->default(0)->after('id');
        });

        SectionField::firstOrCreate(
            ['entity_id' => $entity->id, 'column_name' => 'yelp_verified'],
            [
                'label'        => 'Yelp Verified',
                'type'         => 'boolean',
                'nullable'     => false,
                'list_visible' => true,
                'sort_order'   => 998,
                'mcp_readable' => true,
                'mcp_writable' => false,
            ]
        );
    }

    /**
     * Write only the permanently_closed flag to the DB row.
     */
    protected function updatePermanentlyClosedColumn(
        SectionEntity $entity,
        string $tableName,
        array $columnMap,
        array $rowArr,
        array &$newColumnsAdded,
        bool $permanentlyClosed
    ): void {
        $dbCol = $columnMap['permanently_closed'] ?? null;
        if (!$dbCol) {
            return;
        }

        if (!Schema::hasColumn($tableName, $dbCol)) {
            $this->addColumn($entity, $tableName, $dbCol, 'permanently_closed');
            $newColumnsAdded[] = $dbCol;
        }

        if (isset($rowArr['id'])) {
            DB::table($tableName)->where('id', $rowArr['id'])->update([$dbCol => $permanentlyClosed]);
        }
    }

    /** Persist progress counters to DB so the UI can poll them. */
    protected function persistProgress(
        YelpJobLog $log,
        int $processed, int $failed, int $skipped, int $closed, int $notFound
    ): void {
        YelpJobLog::where('id', $log->id)->update([
            'processed_rows' => $processed,
            'failed_rows'    => $failed,
            'skipped_rows'   => $skipped,
            'closed_rows'    => $closed,
            'not_found_rows' => $notFound,
        ]);
    }

    /** Pick the active account with the highest remaining quota. */
    protected function pickAccount(): ?YelpAccount
    {
        $accounts = YelpAccount::where('is_active', true)->get();
        foreach ($accounts as $account) {
            $account->resetIfStale();
        }
        return $accounts
            ->filter(fn ($a) => $a->hasQuota())
            ->sortByDesc(fn ($a) => $a->daily_limit - $a->requests_today)
            ->first();
    }

    protected function colValue(array $row, ?string $col): ?string
    {
        if (!$col || !isset($row[$col])) {
            return null;
        }
        return (string) $row[$col];
    }

    protected function addColumn(SectionEntity $entity, string $tableName, string $dbColumn, string $yelpField): void
    {
        $fieldInfo = YelpService::availableFields()[$yelpField] ?? ['label' => ucwords(str_replace('_', ' ', $dbColumn)), 'type' => 'string'];
        $colType   = $fieldInfo['type'];

        Schema::table($tableName, function (Blueprint $table) use ($dbColumn, $colType) {
            match ($colType) {
                'boolean' => $table->boolean($dbColumn)->nullable()->after('id'),
                'integer' => $table->unsignedInteger($dbColumn)->nullable()->after('id'),
                'decimal' => $table->decimal($dbColumn, 10, 7)->nullable()->after('id'),
                default   => $table->string($dbColumn)->nullable()->after('id'),
            };
        });

        SectionField::firstOrCreate(
            ['entity_id' => $entity->id, 'column_name' => $dbColumn],
            [
                'label'        => $fieldInfo['label'],
                'type'         => $colType,
                'nullable'     => true,
                'list_visible' => true,
                'sort_order'   => 999,
                'mcp_readable' => true,
                'mcp_writable' => false,
            ]
        );
    }
}
