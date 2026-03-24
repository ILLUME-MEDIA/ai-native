<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class DeployProject extends Model
{
    protected $fillable = [
        'name', 'repo_url', 'github_token', 'branch',
        'framework', 'build_command', 'build_output_dir', 'node_path',
        'ftp_host', 'ftp_username', 'ftp_password', 'ftp_path', 'ftp_port', 'ftp_ssl',
        'webhook_secret', 'auto_deploy', 'deploy_mode', 'poll_interval',
        'status', 'last_commit_hash', 'last_deployed_at',
    ];

    protected $casts = [
        'auto_deploy'      => 'boolean',
        'ftp_ssl'          => 'boolean',
        'ftp_port'         => 'integer',
        'poll_interval'    => 'integer',
        'last_deployed_at' => 'datetime',
        'github_token'     => 'encrypted',
        'ftp_host'         => 'encrypted',
        'ftp_username'     => 'encrypted',
        'ftp_password'     => 'encrypted',
    ];

    protected $hidden = ['github_token', 'ftp_password', 'webhook_secret'];

    protected static function booted(): void
    {
        static::creating(function (self $m) {
            if (empty($m->webhook_secret)) {
                $m->webhook_secret = Str::random(40);
            }
        });
    }

    public function logs(): HasMany
    {
        return $this->hasMany(DeployLog::class, 'project_id')->latest();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function getOwnerRepo(): array
    {
        preg_match('#github\.com[/:]([^/]+)/([^/.]+?)(?:\.git)?$#', $this->repo_url, $m);
        return [$m[1] ?? null, $m[2] ?? null];
    }

    private function decryptField(string $field): ?string
    {
        try { return $this->$field; } catch (\Throwable) { return null; }
    }

    public function getPlainToken(): ?string      { return $this->decryptField('github_token'); }
    public function getPlainFtpPassword(): ?string { return $this->decryptField('ftp_password'); }
    public function getPlainFtpHost(): ?string     { return $this->decryptField('ftp_host'); }
    public function getPlainFtpUsername(): ?string { return $this->decryptField('ftp_username'); }

    public function webhookUrl(): string
    {
        try {
            return url("/api/deploy/webhook/{$this->id}/{$this->webhook_secret}");
        } catch (\Throwable) {
            return "/api/deploy/webhook/{$this->id}/{$this->webhook_secret}";
        }
    }

    public static function detectFramework(array $rootFiles): string
    {
        $files = array_map('strtolower', $rootFiles);
        if (in_array('next.config.js', $files) || in_array('next.config.ts', $files))   return 'next';
        if (in_array('nuxt.config.js', $files) || in_array('nuxt.config.ts', $files))   return 'nuxt';
        if (in_array('astro.config.mjs', $files) || in_array('astro.config.js', $files)) return 'astro';
        if (in_array('gatsby-config.js', $files))                                         return 'gatsby';
        if (in_array('vite.config.js', $files) || in_array('vite.config.ts', $files))   return 'vite';
        if (in_array('package.json', $files))                                             return 'node';
        if (in_array('index.html', $files))                                               return 'html';
        return 'static';
    }

    public static function defaultBuild(string $framework): array
    {
        return match ($framework) {
            'next'   => ['npm run build', 'out'],
            'nuxt'   => ['npm run generate', '.output/public'],
            'vite'   => ['npm run build', 'dist'],
            'astro'  => ['npm run build', 'dist'],
            'gatsby' => ['npm run build', 'public'],
            'node'   => ['npm run build', 'dist'],
            'html', 'static' => [null, null],
            default  => ['npm run build', 'dist'],
        };
    }

    public function toApiArray(): array
    {
        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'repo_url'         => $this->repo_url,
            'has_token'        => !empty($this->getPlainToken()),
            'branch'           => $this->branch,
            'framework'        => $this->framework,
            'build_command'    => $this->build_command,
            'build_output_dir' => $this->build_output_dir,
            'node_path'        => $this->node_path,
            'has_ftp_host'     => !empty($this->getPlainFtpHost()),
            'ftp_username'     => $this->getPlainFtpUsername(),
            'ftp_path'         => $this->ftp_path,
            'ftp_port'         => $this->ftp_port,
            'ftp_ssl'          => $this->ftp_ssl,
            'auto_deploy'      => $this->auto_deploy,
            'deploy_mode'      => $this->deploy_mode ?? 'webhook',
            'poll_interval'    => $this->poll_interval ?? 5,
            'webhook_url'      => $this->webhookUrl(),
            'status'           => $this->status,
            'last_commit_hash' => $this->last_commit_hash,
            'last_deployed_at' => $this->last_deployed_at?->toISOString(),
            'created_at'       => $this->created_at?->toISOString(),
        ];
    }
}
