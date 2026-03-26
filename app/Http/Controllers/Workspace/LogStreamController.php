<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class LogStreamController extends Controller
{
    use AuthorizesRequests;

    /**
     * B-03: Return the last N parsed log entries (initial load).
     */
    public function tail(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $logPath = $this->resolveLogPath($workspace);

        if ($logPath === null) {
            return response()->json(['entries' => [], 'size' => 0, 'log_path' => null]);
        }

        $size    = filesize($logPath);
        // Read last 100 KB to capture enough entries without blowing memory
        $readSize = min($size, 102_400);

        $fp      = fopen($logPath, 'rb');
        fseek($fp, $size - $readSize);
        $content = fread($fp, $readSize);
        fclose($fp);

        // Drop the first potentially-incomplete entry when reading mid-file
        if ($readSize < $size) {
            $firstEntry = strpos($content, "\n[");
            if ($firstEntry !== false) {
                $content = substr($content, $firstEntry + 1);
            }
        }

        $entries = $this->parseLogContent($content);
        $entries = array_slice($entries, -300); // cap at 300 entries

        return response()->json(['entries' => $entries, 'size' => $size]);
    }

    /**
     * B-03: SSE stream — tails the log file and emits new entries as they appear.
     * Runs for up to 55 s, then emits `reconnect` so the client can re-connect.
     */
    public function stream(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        // Client passes the file size it knows about so we skip already-sent lines.
        $knownSize = (int) $request->query('size', 0);

        $logPath = $this->resolveLogPath($workspace);

        return response()->stream(function () use ($logPath, $knownSize) {
            set_time_limit(0);
            ignore_user_abort(false);

            $this->sendSSE('connected', ['status' => 'connected']);

            if ($logPath === null) {
                $this->sendSSE('error', ['message' => 'No log file found in workspace']);
                $this->sendSSE('done', []);
                return;
            }

            $size      = file_exists($logPath) ? filesize($logPath) : 0;
            // If client is up-to-date skip ahead; also guard against log rotation
            $position  = ($knownSize > 0 && $knownSize <= $size) ? $knownSize : $size;
            $startTime = time();

            while (time() - $startTime < 55) {
                if (connection_aborted()) {
                    return;
                }

                if (!file_exists($logPath)) {
                    usleep(500_000);
                    continue;
                }

                clearstatcache(true, $logPath);
                $newSize = filesize($logPath);

                // Log was rotated / truncated — reset position
                if ($newSize < $position) {
                    $position = 0;
                }

                if ($newSize > $position) {
                    $fp      = fopen($logPath, 'rb');
                    fseek($fp, $position);
                    $chunk   = fread($fp, $newSize - $position);
                    fclose($fp);

                    $entries = $this->parseLogContent($chunk);
                    foreach ($entries as $entry) {
                        $this->sendSSE('log', $entry);
                    }

                    $position = $newSize;
                    $this->sendSSE('size', ['size' => $position]);
                }

                usleep(300_000); // poll every 300 ms
            }

            // Tell client to re-connect immediately (keeps the stream alive indefinitely)
            $this->sendSSE('reconnect', ['size' => $position]);
        }, 200, $this->sseHeaders());
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    private function resolveLogPath(Workspace $workspace): ?string
    {
        // Standard Laravel project log location
        $candidates = [
            $workspace->full_path . '/storage/logs/laravel.log',
        ];

        // Also scan for any *.log files one level deep
        $glob = glob(rtrim($workspace->full_path, '/\\') . '/*.log') ?: [];
        foreach ($glob as $f) {
            $candidates[] = $f;
        }
        $glob2 = glob(rtrim($workspace->full_path, '/\\') . '/logs/*.log') ?: [];
        foreach ($glob2 as $f) {
            $candidates[] = $f;
        }

        foreach ($candidates as $path) {
            if (file_exists($path) && is_file($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Parse a raw log string into structured entry objects.
     *
     * Laravel format:
     *   [2026-02-27 14:23:11] local.ERROR: Message {"context":{}} {"extra":{}}
     *   #0 /path/file.php(42): ...
     */
    private function parseLogContent(string $content): array
    {
        $entries = [];
        $current = null;

        foreach (explode("\n", $content) as $line) {
            if (
                preg_match(
                    '/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \S+\.(\w+): (.*)$/',
                    $line,
                    $m
                )
            ) {
                if ($current !== null) {
                    $entries[] = $current;
                }
                $current = [
                    'datetime' => $m[1],
                    'level'    => strtoupper($m[2]),
                    'message'  => rtrim($m[3]),
                    'trace'    => [],
                ];
            } elseif ($current !== null && $line !== '') {
                $current['trace'][] = $line;
            }
        }

        if ($current !== null) {
            $entries[] = $current;
        }

        return $entries;
    }

    private function sseHeaders(): array
    {
        return [
            'Content-Type'      => 'text/event-stream',
            'Cache-Control'     => 'no-cache',
            'Connection'        => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ];
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
