<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. cal_platforms: link to a Section Builder entity as the "users" table
        Schema::table('cal_platforms', function (Blueprint $table) {
            $table->foreignId('users_entity_id')
                  ->nullable()
                  ->after('is_active')
                  ->constrained('section_entities')
                  ->nullOnDelete();
        });

        // 2. kanban_cards: drop FK on openorg_user_id (allow any table), add user_source
        Schema::table('kanban_cards', function (Blueprint $table) {
            $table->dropForeign(['openorg_user_id']);
            $table->string('user_source')->nullable()->after('openorg_user_id');
        });

        // 3. cal_meetings: drop FK on openorg_user_id, add user_source
        Schema::table('cal_meetings', function (Blueprint $table) {
            $table->dropForeign(['openorg_user_id']);
            $table->string('user_source')->nullable()->after('openorg_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('cal_meetings', function (Blueprint $table) {
            $table->dropColumn('user_source');
            $table->foreign('openorg_user_id')->references('id')->on('openorg_users')->nullOnDelete();
        });

        Schema::table('kanban_cards', function (Blueprint $table) {
            $table->dropColumn('user_source');
            $table->foreign('openorg_user_id')->references('id')->on('openorg_users')->nullOnDelete();
        });

        Schema::table('cal_platforms', function (Blueprint $table) {
            $table->dropForeign(['users_entity_id']);
            $table->dropColumn('users_entity_id');
        });
    }
};
