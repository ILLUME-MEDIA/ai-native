<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;

class EnvFileController extends Controller
{
    public function show(Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $basePath     = rtrim($workspace->full_path, '/\\');
        $envPath      = $basePath . '/.env';
        $examplePath  = $basePath . '/.env.example';

        $envVars     = file_exists($envPath)     ? $this->parseEnvFile($envPath)     : [];
        $exampleVars = file_exists($examplePath) ? $this->parseEnvFile($examplePath) : [];

        // Merge keys, computing status for each
        $allKeys = array_unique(array_merge(array_keys($envVars), array_keys($exampleVars)));
        $entries = [];

        foreach ($allKeys as $key) {
            $inEnv     = array_key_exists($key, $envVars);
            $inExample = array_key_exists($key, $exampleVars);
            $value     = $inEnv ? $envVars[$key] : null;

            if ($inEnv && $inExample) {
                $status = 'set';
            } elseif ($inEnv) {
                $status = 'extra';   // in .env but not in .env.example
            } else {
                $status = 'missing'; // in .env.example but not in .env
            }

            $entries[] = [
                'key'         => $key,
                'value'       => $value,
                'status'      => $status,
                'type'        => $this->detectType($key, $value),
                'in_example'  => $inExample,
            ];
        }

        // Sort: set first, then extra, then missing; alphabetical within group
        usort($entries, function ($a, $b) {
            $order = ['set' => 0, 'extra' => 1, 'missing' => 2];
            $oa = $order[$a['status']] ?? 3;
            $ob = $order[$b['status']] ?? 3;
            return $oa !== $ob ? $oa - $ob : strcmp($a['key'], $b['key']);
        });

        return response()->json(['entries' => $entries, 'has_env' => file_exists($envPath)]);
    }

    public function update(Request $request, Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $data = $request->validate([
            'entries'        => 'required|array',
            'entries.*.key'  => 'required|string|max:200',
            'entries.*.value'=> 'nullable|string|max:5000',
        ]);

        $basePath = rtrim($workspace->full_path, '/\\');
        $envPath  = $basePath . '/.env';

        if (!is_dir(dirname($envPath))) {
            return response()->json(['error' => 'Workspace directory not found'], 404);
        }

        $lines = [];
        foreach ($data['entries'] as $entry) {
            $key   = $entry['key'];
            $value = (string) ($entry['value'] ?? '');
            // Quote values that contain spaces or special chars
            if (preg_match('/[\s#"\'\\\\]/', $value) || $value === '') {
                $value = '"' . addcslashes($value, '"\\') . '"';
            }
            $lines[] = "{$key}={$value}";
        }

        file_put_contents($envPath, implode("\n", $lines) . "\n");

        return response()->json(['saved' => true]);
    }

    public function generateAppKey(Workspace $workspace)
    {
        $this->authorize('update', $workspace);

        $key = 'base64:' . base64_encode(random_bytes(32));

        return response()->json(['key' => $key]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function parseEnvFile(string $path): array
    {
        $vars    = [];
        $content = file_get_contents($path);
        foreach (preg_split('/\r\n|\r|\n/', $content) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) continue;
            if (!str_contains($line, '=')) continue;

            [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
            $key   = trim($key);
            $value = trim($value);

            // Strip surrounding quotes
            if (
                (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            $vars[$key] = $value;
        }
        return $vars;
    }

    private function detectType(string $key, ?string $value): string
    {
        if ($value === null) return 'string';
        if (str_starts_with($value, 'base64:')) return 'base64';
        if (in_array(strtolower($value), ['true', 'false'], true)) return 'boolean';
        if (is_numeric($value)) return 'number';
        if (filter_var($value, FILTER_VALIDATE_URL)) return 'url';
        $secretKeywords = ['key', 'secret', 'token', 'password', 'pass', 'pwd', 'api_key'];
        foreach ($secretKeywords as $kw) {
            if (stripos($key, $kw) !== false) return 'secret';
        }
        return 'string';
    }
}
