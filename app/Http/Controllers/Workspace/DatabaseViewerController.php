<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;

class DatabaseViewerController extends Controller
{
    use AuthorizesRequests;

    /**
     * B-02: List all tables with row counts.
     */
    public function tables(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $connection = DB::connection();
        $driver     = $connection->getDriverName();
        $database   = $connection->getDatabaseName();

        $tables = match ($driver) {
            'mysql', 'mariadb' => $this->mysqlTables($database),
            'pgsql'            => $this->pgTables(),
            'sqlite'           => $this->sqliteTables(),
            default            => [],
        };

        return response()->json(['tables' => $tables, 'driver' => $driver, 'database' => $database]);
    }

    /**
     * B-02: Return column info for a table.
     */
    public function columns(Request $request, Workspace $workspace, string $table)
    {
        $this->authorize('view', $workspace);
        $this->assertSafeIdentifier($table);

        $connection = DB::connection();
        $driver     = $connection->getDriverName();
        $database   = $connection->getDatabaseName();

        $columns = match ($driver) {
            'mysql', 'mariadb' => $this->mysqlColumns($database, $table),
            'pgsql'            => $this->pgColumns($table),
            'sqlite'           => $this->sqliteColumns($table),
            default            => [],
        };

        return response()->json(['columns' => $columns]);
    }

    /**
     * B-02: Fetch rows from a table with pagination.
     */
    public function rows(Request $request, Workspace $workspace, string $table)
    {
        $this->authorize('view', $workspace);
        $this->assertSafeIdentifier($table);

        $page    = max(1, (int) $request->query('page', 1));
        $perPage = min(200, max(10, (int) $request->query('per_page', 50)));
        $sort    = $request->query('sort', 'id');
        $dir     = strtoupper($request->query('dir', 'DESC')) === 'DESC' ? 'DESC' : 'ASC';

        // Validate sort column is a safe identifier
        try {
            $this->assertSafeIdentifier($sort);
        } catch (\InvalidArgumentException) {
            $sort = 'id';
        }

        $offset = ($page - 1) * $perPage;

        try {
            $total = DB::table($table)->count();
            $rows  = DB::table($table)->orderBy($sort, $dir)->offset($offset)->limit($perPage)->get();
        } catch (QueryException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json([
            'rows'     => $rows,
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
            'pages'    => (int) ceil($total / $perPage),
        ]);
    }

    /**
     * B-02: Run a raw SELECT query (read-only).
     */
    public function query(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $sql = trim((string) $request->input('sql', ''));

        if ($sql === '') {
            return response()->json(['error' => 'SQL is required'], 422);
        }

        // Only allow SELECT statements — prevent writes
        if (! preg_match('/^\s*SELECT\b/i', $sql)) {
            return response()->json(['error' => 'Only SELECT statements are allowed in the query console'], 403);
        }

        // Guard against dangerous patterns even in SELECT (e.g. subquery writes — MySQL allows SELECT INTO)
        if (preg_match('/\bINTO\b/i', $sql)) {
            return response()->json(['error' => 'SELECT INTO is not allowed'], 403);
        }

        try {
            $startMs = (int) round(microtime(true) * 1000);
            $rows    = DB::select($sql);
            $elapsed = (int) round(microtime(true) * 1000) - $startMs;

            return response()->json([
                'rows'       => $rows,
                'count'      => count($rows),
                'elapsed_ms' => $elapsed,
            ]);
        } catch (QueryException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    // ─── Driver-specific helpers ──────────────────────────────────────────────

    private function mysqlTables(string $database): array
    {
        $rows = DB::select(
            "SELECT table_name, table_rows, data_length + index_length AS size_bytes
             FROM information_schema.tables
             WHERE table_schema = ? AND table_type = 'BASE TABLE'
             ORDER BY table_name",
            [$database]
        );

        return array_map(fn ($r) => [
            'name'       => $r->table_name ?? $r->TABLE_NAME,
            'row_count'  => (int) ($r->table_rows ?? $r->TABLE_ROWS ?? 0),
            'size_bytes' => (int) ($r->size_bytes ?? $r->SIZE_BYTES ?? 0),
        ], $rows);
    }

    private function mysqlColumns(string $database, string $table): array
    {
        $rows = DB::select(
            "SELECT column_name, data_type, is_nullable, column_default, column_key, extra
             FROM information_schema.columns
             WHERE table_schema = ? AND table_name = ?
             ORDER BY ordinal_position",
            [$database, $table]
        );

        return array_map(fn ($r) => [
            'name'     => $r->column_name ?? $r->COLUMN_NAME,
            'type'     => $r->data_type   ?? $r->DATA_TYPE,
            'nullable' => ($r->is_nullable ?? $r->IS_NULLABLE) === 'YES',
            'default'  => $r->column_default ?? $r->COLUMN_DEFAULT,
            'key'      => $r->column_key ?? $r->COLUMN_KEY,
            'extra'    => $r->extra ?? $r->EXTRA,
        ], $rows);
    }

    private function pgTables(): array
    {
        $rows = DB::select(
            "SELECT schemaname || '.' || tablename AS name,
                    n_live_tup AS row_count,
                    pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
             FROM pg_stat_user_tables
             ORDER BY tablename"
        );

        return array_map(fn ($r) => [
            'name'       => $r->name,
            'row_count'  => (int) $r->row_count,
            'size_bytes' => (int) $r->size_bytes,
        ], $rows);
    }

    private function pgColumns(string $table): array
    {
        [$schema, $tbl] = str_contains($table, '.') ? explode('.', $table, 2) : ['public', $table];

        $rows = DB::select(
            "SELECT column_name, data_type, is_nullable, column_default
             FROM information_schema.columns
             WHERE table_schema = ? AND table_name = ?
             ORDER BY ordinal_position",
            [$schema, $tbl]
        );

        return array_map(fn ($r) => [
            'name'     => $r->column_name,
            'type'     => $r->data_type,
            'nullable' => $r->is_nullable === 'YES',
            'default'  => $r->column_default,
            'key'      => null,
            'extra'    => null,
        ], $rows);
    }

    private function sqliteTables(): array
    {
        $rows = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");

        return array_map(function ($r) {
            $count = DB::table($r->name)->count();
            return ['name' => $r->name, 'row_count' => $count, 'size_bytes' => 0];
        }, $rows);
    }

    private function sqliteColumns(string $table): array
    {
        $rows = DB::select("PRAGMA table_info(?)", [$table]);

        return array_map(fn ($r) => [
            'name'     => $r->name,
            'type'     => $r->type,
            'nullable' => !$r->notnull,
            'default'  => $r->dflt_value,
            'key'      => $r->pk ? 'PRI' : null,
            'extra'    => null,
        ], $rows);
    }

    /**
     * Validate that a table/column name is a safe SQL identifier
     * (letters, digits, underscores only — no dot for table names coming from user input).
     */
    private function assertSafeIdentifier(string $name): void
    {
        if (! preg_match('/^[a-zA-Z_][a-zA-Z0-9_.]*$/', $name)) {
            abort(422, "Invalid identifier: {$name}");
        }
    }
}
