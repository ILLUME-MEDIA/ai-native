<?php

namespace App\Services;

use App\Models\SectionEntity;
use App\Models\SectionField;
use App\Models\YelpAccount;
use App\Models\YelpClosedBusiness;
use App\Models\YelpJob;
use App\Models\YelpJobLog;
use App\Models\YelpMatchDiff;
use App\Models\YelpMatchMenuItem;
use App\Models\YelpNotFoundBusiness;
use App\Models\YelpRowLog;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class YelpSyncService
{
    public function run(YelpJob $job, YelpJobLog $log): void
    {
        // Disable PHP execution timeout — syncs can take many minutes for large tables.
        set_time_limit(0);
        ignore_user_abort(true);

        $log->update(['status' => 'running', 'started_at' => now()]);

        YelpRowLog::whereHas('log', fn ($q) => $q->where('started_at', '<', now()->subDays(2)))->delete();

        $entity = $job->entity;
        if (!$entity) {
            $log->update([
                'status' => 'failed',
                'error_message' => 'Entity not found.',
                'completed_at' => now(),
            ]);
            return;
        }

        $tableName = $entity->table_name;
        if (!Schema::hasTable($tableName)) {
            $log->update([
                'status' => 'failed',
                'error_message' => "Table `{$tableName}` not found.",
                'completed_at' => now(),
            ]);
            return;
        }

        $searchCols   = $job->search_columns ?? [];
        $columnMap    = $job->column_mapping ?? [];
        $mode         = $job->mode ?? 'smart';
        $autoMerge    = (bool) ($job->auto_merge ?? false);
        $resumeFromId = (int) ($job->last_processed_id ?? 0);
        $maxCalls     = (int) ($job->max_calls_per_run ?? 0);

        // Fetch reviews only when that field is mapped (costs +1 API call per row)
        $fetchReviews = array_key_exists('recent_reviews_json', $columnMap);
        $callsPerRow  = $fetchReviews ? 4 : 3;

        $this->ensureYelpVerifiedColumn($entity, $tableName);

        $total = DB::table($tableName)->where('id', '>', $resumeFromId)->count();
        $log->update(['total_rows' => $total]);

        if ($total === 0) {
            $log->update(['status' => 'completed', 'completed_at' => now()]);
            $job->update(['last_run_at' => now(), 'last_processed_id' => 0]);
            $job->updateNextRunAt();
            return;
        }

        $newColumnsAdded = [];
        $processed = 0;
        $failed = 0;
        $skipped = 0;
        $closedRows = 0;
        $notFoundRows = 0;
        $account = null;
        $stopped = false;
        $limitHit = false;
        $callsMade = 0;
        $lastProcessedId = $resumeFromId;

        DB::table($tableName)
            ->where('id', '>', $resumeFromId)
            ->orderBy('id')
            ->chunkById(50, function ($rows) use (
                $job,
                $log,
                $entity,
                $tableName,
                $searchCols,
                $columnMap,
                $mode,
                $autoMerge,
                $maxCalls,
                &$callsMade,
                &$lastProcessedId,
                &$processed,
                &$failed,
                &$skipped,
                &$closedRows,
                &$notFoundRows,
                &$newColumnsAdded,
                &$account,
                &$stopped,
                &$limitHit,
                $fetchReviews,
                $callsPerRow
            ) {
                foreach ($rows as $row) {
                    if ($log->isStopRequested()) {
                        $stopped = true;
                        return false;
                    }

                    // search + details + menu [+ reviews] = 3 or 4 calls per row.
                    if ($maxCalls > 0 && ($callsMade + $callsPerRow) > $maxCalls) {
                        $limitHit = true;
                        return false;
                    }

                    $rowArr = (array) $row;
                    $rowId = $rowArr['id'] ?? null;
                    $lastProcessedId = (int) ($rowId ?: $lastProcessedId);

                    try {
                        // Extract all search fields upfront so they're available for any skip/log path.
                        $term    = $this->colValue($rowArr, $searchCols['term']    ?? null);
                        $address = $this->colValue($rowArr, $searchCols['address'] ?? null);
                        $city    = $this->colValue($rowArr, $searchCols['city']    ?? null);
                        $state   = $this->colValue($rowArr, $searchCols['state']   ?? null);
                        $zip     = $this->colValue($rowArr, $searchCols['zip']     ?? null);
                        $location = implode(', ', array_filter([$address, $city, $state, $zip]));

                        $country = $this->resolveCountry($rowArr, $searchCols);
                        if (!$this->isUsCountry($country)) {
                            $skipped++;
                            YelpRowLog::create([
                                'log_id'          => $log->id,
                                'row_id'          => $rowId,
                                'search_term'     => $term,
                                'search_location' => $location ?: null,
                                'status'          => 'skipped',
                                'error'           => 'Country is not US/USA or country is missing.',
                            ]);
                            $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                            continue;
                        }

                        if (!$term) {
                            $termCol = $searchCols['term'] ?? null;
                            $skipped++;
                            YelpRowLog::create([
                                'log_id'          => $log->id,
                                'row_id'          => $rowId,
                                'search_location' => $location ?: null,
                                'status'          => 'skipped',
                                'error'           => $termCol
                                    ? "Business Name column \"{$termCol}\" is empty for this row. Edit the job and ensure the column has data."
                                    : 'Business Name column is not mapped. Edit the job and select a column for "Business Name".',
                            ]);
                            $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                            continue;
                        }

                        $account = $this->pickAccount();
                        if (!$account) {
                            $log->update([
                                'status' => 'paused',
                                'error_message' => 'All Yelp accounts exhausted for today. Resume tomorrow.',
                                'processed_rows' => $processed,
                                'failed_rows' => $failed,
                                'skipped_rows' => $skipped,
                                'closed_rows' => $closedRows,
                                'not_found_rows' => $notFoundRows,
                                'completed_at' => now(),
                            ]);
                            return false;
                        }

                        $yelp = new YelpService($account->api_key);

                        $match = $yelp->searchBusiness($term, $location);
                        $account->incrementUsage();
                        $callsMade++;

                        if (!$match) {
                            $notFoundRows++;
                            $removed = $this->archiveNotFoundAndRemove(
                                $job,
                                $log,
                                $entity,
                                $tableName,
                                $rowId,
                                $rowArr,
                                $term,
                                $location,
                                $country
                            );

                            YelpRowLog::create([
                                'log_id' => $log->id,
                                'row_id' => $rowId,
                                'search_term' => $term,
                                'search_location' => $location ?: null,
                                'status' => 'not_found',
                                'error' => $removed ? null : 'Archived as not_found but source row was not deleted.',
                            ]);

                            $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                            usleep(300000);
                            continue;
                        }

                        $details = $yelp->getBusiness($match['id']);
                        $account->incrementUsage();
                        $callsMade++;

                        if (!$details) {
                            $failed++;
                            DB::table($tableName)->where('id', $rowId)->update(['yelp_verified' => 0]);
                            YelpRowLog::create([
                                'log_id' => $log->id,
                                'row_id' => $rowId,
                                'search_term' => $term,
                                'search_location' => $location ?: null,
                                'status' => 'failed',
                                'yelp_id' => $match['id'] ?? null,
                                'yelp_name' => $match['name'] ?? null,
                                'error' => 'Details fetch returned null.',
                            ]);
                            $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                            usleep(300000);
                            continue;
                        }

                        $permanentlyClosed = (bool) ($details['is_closed'] ?? false);

                        $reviewsPayload = null;
                        if ($fetchReviews) {
                            $reviewsPayload = $yelp->getBusinessReviews($details['id']);
                            $account->incrementUsage();
                            $callsMade++;
                        }

                        $extracted = $yelp->extractFields($details, $reviewsPayload);

                        if ($permanentlyClosed) {
                            $this->updatePermanentlyClosedColumn(
                                $entity,
                                $tableName,
                                $columnMap,
                                $rowArr,
                                $newColumnsAdded,
                                true
                            );

                            $removed = $this->archiveClosedAndRemove(
                                $job,
                                $log,
                                $entity,
                                $tableName,
                                $rowId,
                                $rowArr,
                                $term,
                                $location,
                                $country,
                                $details
                            );

                            YelpRowLog::create([
                                'log_id' => $log->id,
                                'row_id' => $rowId,
                                'search_term' => $term,
                                'search_location' => $location ?: null,
                                'status' => 'closed',
                                'yelp_id' => $details['id'] ?? null,
                                'yelp_name' => $details['name'] ?? null,
                                'yelp_city' => $details['location']['city'] ?? null,
                                'yelp_rating' => $details['rating'] ?? null,
                                'yelp_is_closed' => true,
                                'error' => $removed ? null : 'Archived as closed but source row was not deleted.',
                            ]);

                            $closedRows++;
                            $processed++;
                            $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                            usleep(300000);
                            continue;
                        }

                        if ($mode === 'verify_only') {
                            $this->updatePermanentlyClosedColumn(
                                $entity,
                                $tableName,
                                $columnMap,
                                $rowArr,
                                $newColumnsAdded,
                                false
                            );

                            DB::table($tableName)->where('id', $rowId)->update(['yelp_verified' => 1]);

                            YelpRowLog::create([
                                'log_id' => $log->id,
                                'row_id' => $rowId,
                                'search_term' => $term,
                                'search_location' => $location ?: null,
                                'status' => 'found',
                                'yelp_id' => $details['id'] ?? null,
                                'yelp_name' => $details['name'] ?? null,
                                'yelp_city' => $details['location']['city'] ?? null,
                                'yelp_rating' => $details['rating'] ?? null,
                                'yelp_is_closed' => false,
                            ]);

                            $processed++;
                            $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                            usleep(300000);
                            continue;
                        }

                        [$updates, $diffs] = $this->buildMappedUpdatesAndDiffs(
                            $entity,
                            $tableName,
                            $columnMap,
                            $extracted,
                            $rowArr,
                            $newColumnsAdded
                        );

                        $diff = $this->storeMatchDiff(
                            $job,
                            $log,
                            $entity,
                            $tableName,
                            (int) $rowId,
                            $rowArr,
                            $extracted,
                            $updates,
                            $diffs,
                            $details,
                            $country
                        );

                        $menuItems = $this->fetchAndNormalizeMenuItems($yelp, $details, $account, $callsMade);
                        $businessId = $this->resolveBusinessId($tableName, $rowArr, $rowId ? (int) $rowId : null);
                        $this->storeMatchMenuItems(
                            $diff,
                            $job,
                            $tableName,
                            (int) $rowId,
                            $businessId,
                            $details['id'] ?? null,
                            $menuItems
                        );

                        if ($autoMerge && !empty($updates)) {
                            $updates['yelp_verified'] = 1;
                            DB::table($tableName)->where('id', $rowId)->update($updates);
                            $this->mergeMenuItems($diff, $businessId);
                            $diff->update([
                                'merge_status' => 'merged',
                                'merge_note' => 'Auto-merged during sync run.',
                                'merged_at' => now(),
                            ]);
                        } else {
                            DB::table($tableName)->where('id', $rowId)->update(['yelp_verified' => 1]);
                        }

                        YelpRowLog::create([
                            'log_id' => $log->id,
                            'row_id' => $rowId,
                            'search_term' => $term,
                            'search_location' => $location ?: null,
                            'status' => empty($updates) ? 'found' : 'updated',
                            'yelp_id' => $details['id'] ?? null,
                            'yelp_name' => $details['name'] ?? null,
                            'yelp_city' => $details['location']['city'] ?? null,
                            'yelp_rating' => $details['rating'] ?? null,
                            'yelp_is_closed' => false,
                            'error' => empty($updates) ? 'No mapped fields found to compare.' : null,
                        ]);

                        $processed++;
                        $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                        usleep(300000);
                    } catch (\Throwable $e) {
                        $failed++;
                        YelpRowLog::create([
                            'log_id'          => $log->id,
                            'row_id'          => $rowId,
                            'search_term'     => isset($term) ? $term : null,
                            'search_location' => isset($location) && $location !== '' ? $location : null,
                            'status'          => 'failed',
                            'error'           => $e->getMessage(),
                        ]);
                        $this->persistProgress($log, $processed, $failed, $skipped, $closedRows, $notFoundRows);
                    }
                }
            }, 'id');

        $freshLog = $log->fresh();
        $finalStatus = 'completed';

        if ($stopped || $limitHit || $freshLog->status === 'paused') {
            $finalStatus = 'paused';
        }

        $nextResumeId = $finalStatus === 'completed' ? 0 : $lastProcessedId;

        $log->update([
            'status' => $finalStatus,
            'processed_rows' => $processed,
            'failed_rows' => $failed,
            'skipped_rows' => $skipped,
            'closed_rows' => $closedRows,
            'not_found_rows' => $notFoundRows,
            'new_columns_added' => array_values(array_unique($newColumnsAdded)),
            'account_id' => $account?->id,
            'completed_at' => now(),
        ]);

        $job->update(['last_processed_id' => $nextResumeId]);

        if ($finalStatus === 'completed') {
            $job->update(['last_run_at' => now()]);
            $job->updateNextRunAt();
        }
    }

    protected function resolveCountry(array $row, array $searchCols): ?string
    {
        // If a country COLUMN is explicitly mapped, use it exclusively (per-row filtering).
        // The manual country_value is intentionally ignored when a column is mapped.
        $countryCol = $searchCols['country'] ?? null;
        if ($countryCol) {
            return $this->colValue($row, $countryCol);
        }

        // No column mapped — fall back to the manual country_value (treats all rows the same).
        $manualCountry = trim((string) ($searchCols['country_value'] ?? ''));
        if ($manualCountry !== '') {
            return $manualCountry;
        }

        // Last resort: detect a well-known column name present in the row itself.
        foreach (['country', 'country_code', 'country_name'] as $fallback) {
            if (array_key_exists($fallback, $row) && trim((string) $row[$fallback]) !== '') {
                return trim((string) $row[$fallback]);
            }
        }

        return null;
    }

    protected function isUsCountry(?string $country): bool
    {
        if (!$country) {
            return false;
        }

        $normalized = strtoupper((string) preg_replace('/[^a-z]/i', '', $country));

        return in_array($normalized, [
            'US',
            'USA',
            'UNITEDSTATES',
            'UNITEDSTATESOFAMERICA',
        ], true);
    }

    protected function buildMappedUpdatesAndDiffs(
        SectionEntity $entity,
        string $tableName,
        array $columnMap,
        array $extracted,
        array $rowArr,
        array &$newColumnsAdded
    ): array {
        $updates = [];
        $diffs = [];

        foreach ($columnMap as $yelpField => $dbColumn) {
            if (!array_key_exists($yelpField, $extracted)) {
                continue;
            }

            if (!Schema::hasColumn($tableName, $dbColumn)) {
                $this->addColumn($entity, $tableName, $dbColumn, $yelpField);
                $newColumnsAdded[] = $dbColumn;
            }

            $localValue = $rowArr[$dbColumn] ?? null;
            $yelpValue = $extracted[$yelpField];
            $changed = $this->valuesDiffer($localValue, $yelpValue);

            $updates[$dbColumn] = $yelpValue;
            $diffs[] = [
                'yelp_field' => $yelpField,
                'db_column' => $dbColumn,
                'local_value' => $localValue,
                'yelp_value' => $yelpValue,
                'changed' => $changed,
            ];
        }

        return [$updates, $diffs];
    }

    protected function valuesDiffer(mixed $localValue, mixed $yelpValue): bool
    {
        if (is_bool($localValue) || is_bool($yelpValue)) {
            return (bool) $localValue !== (bool) $yelpValue;
        }

        if ((is_numeric($localValue) && is_numeric($yelpValue))) {
            return (float) $localValue !== (float) $yelpValue;
        }

        return (string) ($localValue ?? '') !== (string) ($yelpValue ?? '');
    }

    protected function storeMatchDiff(
        YelpJob $job,
        YelpJobLog $log,
        SectionEntity $entity,
        string $tableName,
        int $rowId,
        array $rowArr,
        array $extracted,
        array $updates,
        array $diffs,
        array $details,
        ?string $country
    ): YelpMatchDiff {
        return YelpMatchDiff::updateOrCreate(
            [
                'job_id' => $job->id,
                'source_row_id' => $rowId,
            ],
            [
                'log_id' => $log->id,
                'entity_id' => $entity->id,
                'source_table' => $tableName,
                'yelp_business_id' => $details['id'] ?? null,
                'yelp_business_name' => $details['name'] ?? null,
                'country_code' => $country,
                'source_payload' => $rowArr,
                'yelp_payload' => $extracted,
                'field_diffs' => $diffs,
                'mapped_updates' => $updates,
                'merge_status' => 'pending',
                'merge_note' => null,
                'merged_at' => null,
            ]
        );
    }

    protected function fetchAndNormalizeMenuItems(
        YelpService $yelp,
        array $details,
        ?YelpAccount $account,
        int &$callsMade
    ): array {
        $menuPayload = null;
        if (!empty($details['id'])) {
            $menuPayload = $yelp->getBusinessMenu((string) $details['id']);
            if ($account) {
                $account->incrementUsage();
            }
            $callsMade++;
        }

        // API returned items → use them
        $apiItems = $yelp->extractMenuItems($details, $menuPayload);
        if (!empty($apiItems) && ($apiItems[0]['source_type'] ?? '') !== 'details_fallback') {
            return $apiItems;
        }

        // API menu empty or only fallback categories — try web scraper on /menu/{alias}
        $alias = $details['alias'] ?? null;
        if ($alias) {
            $scraped = (new \App\Services\YelpScraperService())->scrapeMenu($alias);
            if (!empty($scraped)) {
                return $scraped;
            }
        }

        return $apiItems; // fallback categories if scraper also failed
    }

    protected function resolveBusinessId(string $sourceTable, array $rowArr, ?int $rowId): ?int
    {
        if (isset($rowArr['business_id']) && is_numeric($rowArr['business_id'])) {
            $candidate = (int) $rowArr['business_id'];
            if ($candidate > 0 && Schema::hasTable('businesses') && DB::table('businesses')->where('id', $candidate)->exists()) {
                return $candidate;
            }
        }

        if ($sourceTable === 'businesses' && $rowId && Schema::hasTable('businesses')) {
            if (DB::table('businesses')->where('id', $rowId)->exists()) {
                return $rowId;
            }
        }

        return null;
    }

    protected function storeMatchMenuItems(
        YelpMatchDiff $diff,
        YelpJob $job,
        string $sourceTable,
        int $sourceRowId,
        ?int $businessId,
        ?string $yelpBusinessId,
        array $items
    ): void {
        YelpMatchMenuItem::where('match_diff_id', $diff->id)->delete();

        foreach ($items as $idx => $item) {
            $menuItemId = $item['yelp_menu_item_id'] ?? substr(
                sha1(($item['name'] ?? 'item') . '|' . ($item['category'] ?? '') . '|' . $idx),
                0,
                40
            );

            YelpMatchMenuItem::create([
                'match_diff_id'    => $diff->id,
                'job_id'           => $job->id,
                'source_row_id'    => $sourceRowId,
                'source_table'     => $sourceTable,
                'business_id'      => $businessId,
                'yelp_business_id' => $yelpBusinessId,
                'yelp_menu_item_id'=> $menuItemId,
                'name'             => (string) ($item['name'] ?? 'Untitled Item'),
                'category'         => $item['category'] ?? null,
                'description'      => $item['description'] ?? null,
                'price'            => isset($item['price']) ? (float) $item['price'] : null,
                'currency'         => $item['currency'] ?? 'USD',
                'image'            => $item['image'] ?? null,
                'is_available'     => (bool) ($item['is_available'] ?? true),
                'sort_order'       => (int) ($item['sort_order'] ?? $idx),
                'source_type'      => $item['source_type'] ?? 'details_fallback',
                'raw_payload'      => $item['raw_payload'] ?? null,
                'modifiers_json'   => $item['modifiers_json'] ?? null,
            ]);
        }
    }

    protected function mergeMenuItems(YelpMatchDiff $diff, ?int $businessId): void
    {
        if (!$businessId) {
            return;
        }

        if (!Schema::hasTable('menu_items') || !Schema::hasTable('menu_categories')) {
            return;
        }

        if (!DB::table('businesses')->where('id', $businessId)->exists()) {
            return;
        }

        $menuRows = YelpMatchMenuItem::where('match_diff_id', $diff->id)->orderBy('sort_order')->get();
        if ($menuRows->isEmpty()) {
            return;
        }

        $hasYelpMenuItemId  = Schema::hasColumn('menu_items', 'yelp_menu_item_id');
        $hasYelpBusinessId  = Schema::hasColumn('menu_items', 'yelp_business_id');
        $hasYelpSyncedAt    = Schema::hasColumn('menu_items', 'yelp_synced_at');

        foreach ($menuRows as $menuRow) {
            $categoryName = trim((string) ($menuRow->category ?: 'Yelp Imported'));
            $category = \App\Models\MenuCategory::firstOrCreate(
                ['business_id' => $businessId, 'name' => $categoryName],
                ['description' => 'Imported from Yelp', 'sort_order' => 0, 'is_active' => true]
            );

            $payload = [
                'business_id'      => $businessId,
                'menu_category_id' => $category->id,
                'name'             => $menuRow->name,
                'description'      => $menuRow->description,
                'price'            => $menuRow->price ?? 0,
                'image'            => $menuRow->image,
                'is_available'     => $menuRow->is_available,
            ];

            if ($hasYelpBusinessId)  $payload['yelp_business_id']   = $menuRow->yelp_business_id;
            if ($hasYelpMenuItemId)  $payload['yelp_menu_item_id']   = $menuRow->yelp_menu_item_id;
            if ($hasYelpSyncedAt)    $payload['yelp_synced_at']       = now();

            $existingQuery = \App\Models\MenuItem::where('business_id', $businessId);
            if ($menuRow->yelp_menu_item_id && $hasYelpMenuItemId) {
                $existingQuery->where('yelp_menu_item_id', $menuRow->yelp_menu_item_id);
            } else {
                $existingQuery->where('name', $menuRow->name)->where('menu_category_id', $category->id);
            }

            $existing = $existingQuery->first();
            if ($existing) {
                $existing->update($payload);
            } else {
                \App\Models\MenuItem::create($payload);
            }
        }
    }

    protected function archiveClosedAndRemove(
        YelpJob $job,
        YelpJobLog $log,
        SectionEntity $entity,
        string $tableName,
        ?int $rowId,
        array $rowArr,
        string $term,
        string $location,
        ?string $country,
        array $details
    ): bool {
        $removed = $this->removeSourceRow($job, $tableName, $rowId);

        YelpClosedBusiness::create([
            'job_id' => $job->id,
            'log_id' => $log->id,
            'entity_id' => $entity->id,
            'source_table' => $tableName,
            'source_row_id' => $rowId,
            'search_term' => $term,
            'search_location' => $location ?: null,
            'country_code' => $country,
            'yelp_business_id' => $details['id'] ?? null,
            'yelp_business_name' => $details['name'] ?? null,
            'source_payload' => $rowArr,
            'yelp_payload' => $details,
            'removed_from_source' => $removed,
            'reason' => 'permanently_closed_on_yelp',
        ]);

        return $removed;
    }

    protected function archiveNotFoundAndRemove(
        YelpJob $job,
        YelpJobLog $log,
        SectionEntity $entity,
        string $tableName,
        ?int $rowId,
        array $rowArr,
        string $term,
        string $location,
        ?string $country
    ): bool {
        $removed = $this->removeSourceRow($job, $tableName, $rowId);

        YelpNotFoundBusiness::create([
            'job_id' => $job->id,
            'log_id' => $log->id,
            'entity_id' => $entity->id,
            'source_table' => $tableName,
            'source_row_id' => $rowId,
            'search_term' => $term,
            'search_location' => $location ?: null,
            'country_code' => $country,
            'source_payload' => $rowArr,
            'removed_from_source' => $removed,
            'reason' => 'not_found_on_yelp',
        ]);

        return $removed;
    }

    protected function removeSourceRow(YelpJob $job, string $tableName, ?int $rowId): bool
    {
        if (!$rowId) {
            return false;
        }

        YelpMatchDiff::where('job_id', $job->id)
            ->where('source_row_id', $rowId)
            ->delete();

        return DB::table($tableName)->where('id', $rowId)->delete() > 0;
    }

    protected function ensureYelpVerifiedColumn(SectionEntity $entity, string $tableName): void
    {
        if (Schema::hasColumn($tableName, 'yelp_verified')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement("SET SESSION sql_mode = ''");
        }

        Schema::table($tableName, function (Blueprint $table) {
            $table->boolean('yelp_verified')->default(0)->after('id');
        });

        SectionField::firstOrCreate(
            ['entity_id' => $entity->id, 'column_name' => 'yelp_verified'],
            [
                'label' => 'Yelp Verified',
                'type' => 'boolean',
                'nullable' => false,
                'list_visible' => true,
                'sort_order' => 998,
                'mcp_readable' => true,
                'mcp_writable' => false,
            ]
        );
    }

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

    protected function persistProgress(
        YelpJobLog $log,
        int $processed,
        int $failed,
        int $skipped,
        int $closed,
        int $notFound
    ): void {
        YelpJobLog::where('id', $log->id)->update([
            'processed_rows' => $processed,
            'failed_rows' => $failed,
            'skipped_rows' => $skipped,
            'closed_rows' => $closed,
            'not_found_rows' => $notFound,
        ]);
    }

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
        if (!$col || !array_key_exists($col, $row)) {
            return null;
        }

        $value = trim((string) ($row[$col] ?? ''));
        return $value === '' ? null : $value;
    }

    protected function addColumn(SectionEntity $entity, string $tableName, string $dbColumn, string $yelpField): void
    {
        $fieldInfo = YelpService::availableFields()[$yelpField]
            ?? ['label' => ucwords(str_replace('_', ' ', $dbColumn)), 'type' => 'string'];
        $colType = $fieldInfo['type'];

        if (DB::getDriverName() === 'mysql') {
            DB::statement("SET SESSION sql_mode = ''");
        }

        // JSON fields need TEXT, not VARCHAR(191)
        $isJsonCol = str_ends_with($dbColumn, '_json') || $colType === 'text';

        Schema::table($tableName, function (Blueprint $table) use ($dbColumn, $colType, $isJsonCol) {
            match (true) {
                $colType === 'boolean' => $table->boolean($dbColumn)->nullable()->after('id'),
                $colType === 'integer' => $table->unsignedInteger($dbColumn)->nullable()->after('id'),
                $colType === 'decimal' => $table->decimal($dbColumn, 10, 7)->nullable()->after('id'),
                $isJsonCol            => $table->text($dbColumn)->nullable()->after('id'),
                default               => $table->string($dbColumn)->nullable()->after('id'),
            };
        });

        SectionField::firstOrCreate(
            ['entity_id' => $entity->id, 'column_name' => $dbColumn],
            [
                'label' => $fieldInfo['label'],
                'type' => $colType,
                'nullable' => true,
                'list_visible' => true,
                'sort_order' => 999,
                'mcp_readable' => true,
                'mcp_writable' => false,
            ]
        );
    }
}
