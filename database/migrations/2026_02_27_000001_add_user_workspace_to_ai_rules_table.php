<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_rules', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->after('id');
            $table->foreignId('workspace_id')->nullable()->constrained()->nullOnDelete()->after('user_id');
            $table->index(['user_id', 'workspace_id']);
        });
    }

    public function down(): void
    {
        Schema::table('ai_rules', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['workspace_id']);
            $table->dropIndex(['user_id', 'workspace_id']);
            $table->dropColumn(['user_id', 'workspace_id']);
        });
    }
};
