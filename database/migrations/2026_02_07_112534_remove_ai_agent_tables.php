<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('ai_audit_logs') && Schema::hasColumn('ai_audit_logs', 'agent_id')) {
            $fk = DB::selectOne(
                "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ai_audit_logs' AND COLUMN_NAME = 'agent_id' AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1",
                [DB::getDatabaseName()]
            );
            if ($fk && ! empty($fk->CONSTRAINT_NAME)) {
                Schema::table('ai_audit_logs', function (Blueprint $table) use ($fk) {
                    $table->dropForeign($fk->CONSTRAINT_NAME);
                });
            }
            Schema::table('ai_audit_logs', function (Blueprint $table) {
                $table->dropColumn('agent_id');
            });
        }

        Schema::dropIfExists('ai_agent_permissions');
        Schema::dropIfExists('ai_agents');
    }

    public function down(): void
    {
        // Re-creating these is complex because of original structure, 
        // usually we don't need to revert an architecture purge like this
    }
};
