<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deploy_projects', function (Blueprint $table) {
            // webhook = GitHub sends POST on push (requires public server)
            // poll    = CMS checks GitHub API every N minutes for new commits (no webhook needed)
            $table->string('deploy_mode')->default('webhook')->after('auto_deploy');
            $table->unsignedTinyInteger('poll_interval')->default(5)->after('deploy_mode'); // minutes
        });
    }

    public function down(): void
    {
        Schema::table('deploy_projects', function (Blueprint $table) {
            $table->dropColumn(['deploy_mode', 'poll_interval']);
        });
    }
};
