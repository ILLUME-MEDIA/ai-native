<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('jira_configs')) {
            Schema::create('jira_configs', function (Blueprint $table) {
                $table->id();
                $table->string('domain');
                $table->string('email');
                $table->text('api_token'); // Encrypted
                $table->string('default_project_key');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jira_configs');
    }
};
