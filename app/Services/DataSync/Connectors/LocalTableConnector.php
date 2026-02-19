<?php

namespace App\Services\DataSync\Connectors;

use App\Services\DataSync\Contracts\ConnectorInterface;
use Illuminate\Support\Facades\DB;

/**
 * Reads businesses from a local MySQL table (e.g. muzzhub, pakistanhub).
 *
 * Config keys:
 *   table      (required) - name of the local DB table
 *   field_map  (optional) - { "source_col": "business_col" }
 *                           if omitted, columns are assumed to match Business fields
 *   batch_size (optional) - rows per batch (default 200)
 */
class LocalTableConnector implements ConnectorInterface
{
    public function __construct(private readonly array $config) {}

    public function count(): int
    {
        return (int) DB::table($this->table())->count();
    }

    public function businesses(): iterable
    {
        $batchSize = (int) ($this->config['batch_size'] ?? 200);
        $table     = $this->table();

        DB::table($table)->orderBy('id')->chunk($batchSize, function ($rows) {
            foreach ($rows as $row) {
                yield (array) $row;
            }
        });

        // chunk() doesn't support generators; use cursor instead
        return DB::table($table)->orderBy('id')->cursor()->map(fn($r) => (array) $r);
    }

    private function table(): string
    {
        $table = $this->config['table'] ?? null;
        if (!$table) {
            throw new \InvalidArgumentException('LocalTableConnector requires config.table');
        }
        return $table;
    }

    public function fieldMap(): array
    {
        return $this->config['field_map'] ?? [];
    }
}
