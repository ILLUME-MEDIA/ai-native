<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class TestRunnerController extends Controller
{
    use AuthorizesRequests;

    /**
     * B-04: List available test suites (test files in tests/).
     */
    public function suites(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $testsDir = rtrim($workspace->full_path, '/\\') . DIRECTORY_SEPARATOR . 'tests';

        if (! is_dir($testsDir)) {
            return response()->json(['suites' => []]);
        }

        $suites = $this->scanTestFiles($testsDir, $workspace->full_path);

        return response()->json(['suites' => $suites]);
    }

    /**
     * B-04: SSE stream — runs PHPUnit / Pest and streams structured test events.
     *
     * Query params:
     *   filter (optional) — path fragment to filter (e.g. "Unit", "Feature/UserTest.php")
     *   runner (optional) — "phpunit" | "pest" | "artisan" (default: auto-detect)
     */
    public function run(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $filter  = $request->query('filter', '');
        $runner  = $request->query('runner', 'auto');
        $root    = rtrim($workspace->full_path, '/\\');

        return response()->stream(function () use ($root, $filter, $runner) {
            set_time_limit(0);
            ignore_user_abort(false);

            $this->sendSSE('connected', ['status' => 'connected']);

            if (! is_dir($root)) {
                $this->sendSSE('error', ['message' => 'Workspace directory not found']);
                $this->sendSSE('done', ['summary' => null]);
                return;
            }

            // Auto-detect runner: prefer Pest if installed, else phpunit, else artisan
            $cmd = $this->resolveCommand($root, $runner, $filter);

            if ($cmd === null) {
                $this->sendSSE('error', ['message' => 'No test runner found. Install PHPUnit or Pest.']);
                $this->sendSSE('done', ['summary' => null]);
                return;
            }

            $process = Process::fromShellCommandline($cmd, $root, null, null, 120);
            $process->start();

            // Accumulate JSON output (--json writes one big blob at the end for PHPUnit,
            // but Pest outputs team-city events line-by-line; we handle both).
            $jsonBuffer = '';
            $rawLines   = [];

            $process->wait(function ($type, $chunk) use (&$jsonBuffer, &$rawLines) {
                foreach (explode("\n", $chunk) as $line) {
                    $line = rtrim($line);
                    if ($line === '') {
                        continue;
                    }

                    $rawLines[] = $line;

                    // Attempt to detect team-city / Pest line-by-line events
                    if (str_starts_with($line, '##teamcity[')) {
                        $event = $this->parseTeamCity($line);
                        if ($event) {
                            $this->sendSSE('test', $event);
                        }
                        continue;
                    }

                    // Accumulate raw output for PHPUnit JSON mode
                    $jsonBuffer .= $line;
                }
            });

            // Parse PHPUnit JSON output (--json dumps everything at end)
            if ($jsonBuffer !== '') {
                $decoded = json_decode($jsonBuffer, true);
                if (is_array($decoded)) {
                    // PHPUnit 10+ --json: array of test result objects
                    foreach ($decoded as $result) {
                        $this->sendSSE('test', $this->normalizePhpunitResult($result));
                    }
                }
            }

            $exitCode = $process->getExitCode();
            $summary  = $this->buildSummary($rawLines, $exitCode);

            $this->sendSSE('done', ['summary' => $summary, 'exit_code' => $exitCode]);
        }, 200, [
            'Content-Type'      => 'text/event-stream',
            'Cache-Control'     => 'no-cache',
            'Connection'        => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Resolve the command to run tests, auto-detecting the runner.
     */
    private function resolveCommand(string $root, string $runner, string $filter): ?string
    {
        $filterArg = $filter !== '' ? ' --filter ' . escapeshellarg($filter) : '';

        if ($runner === 'artisan' || ($runner === 'auto' && file_exists($root . '/artisan'))) {
            // Prefer `php artisan test` (works for both PHPUnit and Pest projects)
            $php = PHP_BINARY;
            return "{$php} artisan test --json{$filterArg}";
        }

        // Pest binary
        $pestBin = $root . '/vendor/bin/pest';
        if (($runner === 'pest' || $runner === 'auto') && file_exists($pestBin)) {
            return escapeshellarg($pestBin) . " --json{$filterArg}";
        }

        // PHPUnit binary
        $phpunitBin = $root . '/vendor/bin/phpunit';
        if (($runner === 'phpunit' || $runner === 'auto') && file_exists($phpunitBin)) {
            return escapeshellarg($phpunitBin) . " --log-junit php://stdout{$filterArg}";
        }

        return null;
    }

    /**
     * Parse a ##teamcity[...] line emitted by Pest/PHPUnit team-city reporter.
     */
    private function parseTeamCity(string $line): ?array
    {
        if (! preg_match('/##teamcity\[(\w+)\s*(.*)\]/', $line, $m)) {
            return null;
        }

        $event  = $m[1];
        $attrs  = $this->parseTeamCityAttrs($m[2]);
        $name   = $attrs['name'] ?? '';
        $file   = $attrs['locationHint'] ?? null;
        $ms     = isset($attrs['duration']) ? (int) $attrs['duration'] : null;

        // Normalize file hint: php_qn://path::class::method → path
        if ($file && preg_match('#php_qn://([^:]+)#', $file, $fm)) {
            $file = $fm[1];
        }

        return match ($event) {
            'testStarted'  => ['status' => 'running', 'name' => $name, 'file' => $file],
            'testFinished' => ['status' => 'passed',  'name' => $name, 'file' => $file, 'duration_ms' => $ms],
            'testFailed'   => ['status' => 'failed',  'name' => $name, 'file' => $file, 'message' => $attrs['message'] ?? '', 'details' => $attrs['details'] ?? ''],
            'testIgnored'  => ['status' => 'skipped', 'name' => $name, 'file' => $file],
            default        => null,
        };
    }

    /** Parse key='value' pairs from a teamcity attribute string. */
    private function parseTeamCityAttrs(string $raw): array
    {
        $attrs = [];
        preg_match_all('/(\w+)=\'((?:[^\']|\'\')*?)\'/', $raw, $matches, PREG_SET_ORDER);
        foreach ($matches as $match) {
            $attrs[$match[1]] = str_replace("''", "'", $match[2]);
        }
        return $attrs;
    }

    /** Normalize a PHPUnit --json result object. */
    private function normalizePhpunitResult(array $result): array
    {
        $status = match ($result['status'] ?? '') {
            'passed'  => 'passed',
            'failure' => 'failed',
            'error'   => 'failed',
            'skipped' => 'skipped',
            'risky'   => 'skipped',
            default   => 'passed',
        };

        return [
            'status'      => $status,
            'name'        => $result['testCaseClass'] . '::' . ($result['testCaseName'] ?? $result['test'] ?? ''),
            'file'        => $result['file'] ?? null,
            'line'        => $result['line'] ?? null,
            'duration_ms' => isset($result['time']) ? (int) round($result['time'] * 1000) : null,
            'message'     => $result['message'] ?? '',
        ];
    }

    /**
     * Parse the summary line from raw output (works for both PHPUnit and Pest).
     * e.g. "Tests: 12 passed, 1 failed, 2 skipped"
     */
    private function buildSummary(array $lines, int $exitCode): array
    {
        $passed  = 0;
        $failed  = 0;
        $skipped = 0;
        $total   = 0;

        foreach (array_reverse($lines) as $line) {
            // PHPUnit: "Tests: 12, Assertions: 34, Failures: 1."
            if (preg_match('/Tests:\s*(\d+)/', $line, $m)) {
                $total = (int) $m[1];
            }
            if (preg_match('/Failures:\s*(\d+)/i', $line, $m)) {
                $failed = (int) $m[1];
            }
            if (preg_match('/Skipped:\s*(\d+)/i', $line, $m)) {
                $skipped = (int) $m[1];
            }
            // Pest: "PASS  Tests: 5 passed (12 assertions)"
            if (preg_match('/(\d+) passed/i', $line, $m)) {
                $passed = (int) $m[1];
                break;
            }
        }

        if ($passed === 0 && $total > 0) {
            $passed = $total - $failed - $skipped;
        }

        return [
            'total'   => $total,
            'passed'  => $passed,
            'failed'  => $failed,
            'skipped' => $skipped,
            'ok'      => $exitCode === 0,
        ];
    }

    /** Recursively scan for test files (Feature/, Unit/ etc.). */
    private function scanTestFiles(string $dir, string $rootPath): array
    {
        $results = [];
        $it      = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS));

        foreach ($it as $file) {
            if (! $file->isFile()) {
                continue;
            }
            if (! str_ends_with($file->getFilename(), 'Test.php') && ! str_ends_with($file->getFilename(), '.test.php')) {
                continue;
            }

            $abs      = $file->getRealPath();
            $relative = ltrim(str_replace($rootPath, '', $abs), '/\\');

            $results[] = [
                'path'     => $relative,
                'name'     => $file->getFilename(),
                'group'    => basename($file->getPath()), // e.g. Feature, Unit
            ];
        }

        usort($results, fn ($a, $b) => strcmp($a['path'], $b['path']));

        return $results;
    }

    private function sendSSE(string $event, mixed $data): void
    {
        echo "event: {$event}\n";
        echo 'data: ' . json_encode($data) . "\n\n";

        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
    }
}
