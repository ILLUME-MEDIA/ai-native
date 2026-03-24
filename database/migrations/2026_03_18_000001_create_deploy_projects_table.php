<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deploy_projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('repo_url');                          // https://github.com/owner/repo
            $table->text('github_token')->nullable();            // encrypted, for private repos
            $table->string('branch')->default('main');

            // Build settings (auto-detected or manual override)
            $table->string('framework')->nullable();             // html|react|vue|next|nuxt|vite|cra|static|custom
            $table->string('build_command')->nullable();         // e.g. "npm run build" — null = no build (static)
            $table->string('build_output_dir')->nullable();      // e.g. "dist" — null = root
            $table->string('node_path')->nullable();             // e.g. "/usr/local/bin/node" for custom server paths

            // FTP deploy target
            $table->text('ftp_host')->nullable();                // encrypted
            $table->text('ftp_username')->nullable();            // encrypted
            $table->text('ftp_password')->nullable();            // encrypted
            $table->string('ftp_path')->default('/');            // e.g. /public_html/mysite/
            $table->unsignedSmallInteger('ftp_port')->default(21);
            $table->boolean('ftp_ssl')->default(false);

            // Webhook & auto-deploy
            $table->string('webhook_secret', 64)->nullable();    // HMAC secret for GitHub webhook
            $table->boolean('auto_deploy')->default(false);

            // Status tracking
            $table->string('status')->default('idle');           // idle|deploying|success|failed
            $table->string('last_commit_hash', 40)->nullable();
            $table->timestamp('last_deployed_at')->nullable();

            $table->timestamps();
        });

        Schema::create('deploy_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('deploy_projects')->cascadeOnDelete();
            $table->string('status')->default('pending');        // pending|running|success|failed
            $table->string('commit_hash', 40)->nullable();
            $table->string('commit_message')->nullable();
            $table->string('branch')->default('main');
            $table->string('triggered_by')->default('manual');   // webhook|manual
            $table->longText('output')->nullable();              // full build+deploy log
            $table->unsignedSmallInteger('duration_seconds')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deploy_logs');
        Schema::dropIfExists('deploy_projects');
    }
};
