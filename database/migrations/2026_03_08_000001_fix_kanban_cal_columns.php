<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add cal_platform_id to kanban_boards so CalService can find the right board
        Schema::table('kanban_boards', function (Blueprint $table) {
            $table->foreignId('cal_platform_id')->nullable()->after('is_active')
                ->constrained('cal_platforms')->nullOnDelete();
        });

        // Add Cal/meeting-related columns to kanban_cards
        Schema::table('kanban_cards', function (Blueprint $table) {
            $table->unsignedBigInteger('openorg_user_id')->nullable()->after('assignee');
            $table->string('user_source')->nullable()->after('openorg_user_id');
            $table->unsignedBigInteger('source_meeting_id')->nullable()->after('user_source');
            $table->boolean('is_meeting_card')->default(false)->after('source_meeting_id');
        });
    }

    public function down(): void
    {
        Schema::table('kanban_cards', function (Blueprint $table) {
            $table->dropColumn(['openorg_user_id', 'user_source', 'source_meeting_id', 'is_meeting_card']);
        });

        Schema::table('kanban_boards', function (Blueprint $table) {
            $table->dropForeign(['cal_platform_id']);
            $table->dropColumn('cal_platform_id');
        });
    }
};
