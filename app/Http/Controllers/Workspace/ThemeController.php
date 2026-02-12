<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ThemeController extends Controller
{
    /**
     * Get workspace theme
     */
    public function getTheme(Request $request, $id)
    {
        $workspace = Workspace::findOrFail($id);

        $themePath = "workspaces/{$workspace->id}/theme.json";

        if (Storage::disk('local')->exists($themePath)) {
            $themeData = json_decode(Storage::disk('local')->get($themePath), true);

            return response()->json([
                'theme' => $themeData['theme'] ?? null,
                'mode' => $themeData['mode'] ?? 'light',
            ]);
        }

        return response()->json([
            'theme' => null,
            'mode' => 'light',
        ]);
    }

    /**
     * Save workspace theme
     */
    public function saveTheme(Request $request, $id)
    {
        $workspace = Workspace::findOrFail($id);

        $validated = $request->validate([
            'theme' => 'required|array',
            'theme.colors' => 'required|array',
            'theme.typography' => 'required|array',
            'theme.effects' => 'required|array',
            'theme.rules' => 'required|array',
            'mode' => 'required|string|in:light,dark',
        ]);

        $themePath = "workspaces/{$workspace->id}/theme.json";

        $themeData = [
            'theme' => $validated['theme'],
            'mode' => $validated['mode'],
            'updated_at' => now()->toIso8601String(),
        ];

        Storage::disk('local')->put($themePath, json_encode($themeData, JSON_PRETTY_PRINT));

        // Also write theme files into the workspace for code-sync
        $fs = app(\Illuminate\Filesystem\Filesystem::class);
        $workspaceDir = $workspace->full_path;
        if (!$fs->isDirectory($workspaceDir)) {
            $fs->makeDirectory($workspaceDir, 0755, true);
        }

        $themeDir = $workspaceDir . DIRECTORY_SEPARATOR . '.workspace';
        if (!$fs->isDirectory($themeDir)) {
            $fs->makeDirectory($themeDir, 0755, true);
        }

        $jsonRel = '.workspace/theme.json';
        $cssRel = '.workspace/theme.css';

        $jsonFull = $workspaceDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $jsonRel);
        $cssFull = $workspaceDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $cssRel);

        $fs->put($jsonFull, json_encode($themeData, JSON_PRETTY_PRINT), true);

        $cssVars = $this->themeToCssVars($validated['theme'], $validated['mode']);
        $fs->put($cssFull, $cssVars, true);

        return response()->json([
            'success' => true,
            'message' => 'Theme saved successfully',
            'fs_patches' => [
                [
                    'op' => 'create',
                    'path' => $jsonRel,
                    'type' => 'file',
                    'node' => [
                        'name' => 'theme.json',
                        'path' => $jsonRel,
                        'type' => 'file',
                        'size' => strlen(json_encode($themeData, JSON_PRETTY_PRINT)),
                        'extension' => 'json',
                    ],
                ],
                [
                    'op' => 'create',
                    'path' => $cssRel,
                    'type' => 'file',
                    'node' => [
                        'name' => 'theme.css',
                        'path' => $cssRel,
                        'type' => 'file',
                        'size' => strlen($cssVars),
                        'extension' => 'css',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Delete workspace theme (reset to default)
     */
    public function deleteTheme(Request $request, $id)
    {
        $workspace = Workspace::findOrFail($id);

        $themePath = "workspaces/{$workspace->id}/theme.json";

        if (Storage::disk('local')->exists($themePath)) {
            Storage::disk('local')->delete($themePath);
        }

        // Remove workspace-synced files too
        $fs = app(\Illuminate\Filesystem\Filesystem::class);
        $workspaceDir = $workspace->full_path;
        $jsonRel = '.workspace/theme.json';
        $cssRel = '.workspace/theme.css';
        $jsonFull = $workspaceDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $jsonRel);
        $cssFull = $workspaceDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $cssRel);
        if ($fs->exists($jsonFull)) $fs->delete($jsonFull);
        if ($fs->exists($cssFull)) $fs->delete($cssFull);

        return response()->json([
            'success' => true,
            'message' => 'Theme reset to default',
            'fs_patches' => [
                ['op' => 'delete', 'path' => $jsonRel, 'type' => 'file'],
                ['op' => 'delete', 'path' => $cssRel, 'type' => 'file'],
            ],
        ]);
    }

    protected function themeToCssVars(array $theme, string $mode): string
    {
        $colors = $theme['colors'] ?? [];
        $typography = $theme['typography'] ?? [];
        $effects = $theme['effects'] ?? [];
        $rules = $theme['rules'] ?? [];

        $lines = [];
        $lines[] = "/* Auto-generated by Theme Panel */";
        $lines[] = ":root {";

        // Colors
        $lines[] = "  --theme-primary-fg: " . ($colors['primary']['foreground'] ?? '#ffffff') . ";";
        $lines[] = "  --theme-primary-bg: " . ($colors['primary']['background'] ?? '#0d6efd') . ";";
        $lines[] = "  --theme-secondary-fg: " . ($colors['secondary']['foreground'] ?? '#ffffff') . ";";
        $lines[] = "  --theme-secondary-bg: " . ($colors['secondary']['background'] ?? '#6c757d') . ";";
        $lines[] = "  --theme-accent-fg: " . ($colors['accent']['foreground'] ?? '#ffffff') . ";";
        $lines[] = "  --theme-accent-bg: " . ($colors['accent']['background'] ?? '#0dcaf0') . ";";
        $lines[] = "  --theme-base-bg: " . ($colors['base']['background'] ?? '#ffffff') . ";";
        $lines[] = "  --theme-base-fg: " . ($colors['base']['foreground'] ?? '#212529') . ";";
        $lines[] = "  --theme-muted: " . ($colors['base']['muted'] ?? '#6c757d') . ";";
        $lines[] = "  --theme-border: " . ($colors['base']['border'] ?? '#dee2e6') . ";";
        $lines[] = "  --theme-card-bg: " . ($colors['card']['background'] ?? '#ffffff') . ";";
        $lines[] = "  --theme-card-fg: " . ($colors['card']['foreground'] ?? '#212529') . ";";

        // Typography
        $lines[] = "  --theme-font-family: " . ($typography['fontFamily'] ?? 'system-ui, sans-serif') . ";";
        $lines[] = "  --theme-font-size: " . ($typography['fontSize']['base'] ?? '14px') . ";";
        $lines[] = "  --theme-line-height: " . ($typography['lineHeight'] ?? '1.5') . ";";

        // Effects / rules
        $lines[] = "  --theme-border-radius: " . ($effects['borderRadius'] ?? '4px') . ";";
        $lines[] = "  --theme-shadow: " . ($effects['shadow']['medium'] ?? '0 4px 6px rgba(0,0,0,0.1)') . ";";
        $lines[] = "  --theme-blur: " . ($effects['blur'] ?? '8px') . ";";
        $lines[] = "  --theme-transition: " . ($rules['transition'] ?? '0.2s ease') . ";";
        $lines[] = "}";
        $lines[] = "";
        $lines[] = "html[data-theme-mode=\"{$mode}\"] {";
        $lines[] = "  /* mode marker */";
        $lines[] = "}";
        $lines[] = "";

        return implode("\n", $lines);
    }
}
