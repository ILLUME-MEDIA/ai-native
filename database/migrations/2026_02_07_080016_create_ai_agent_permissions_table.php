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
        if (!Schema::hasTable('ai_agent_permissions')) {
            Schema::create('ai_agent_permissions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('agent_id')->constrained('ai_agents')->onDelete('cascade');
                $table->string('capability'); // e.g., create_files, shell_commands, database_manage
                $table->boolean('is_enabled')->default(false);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_agent_permissions');
    }
};
