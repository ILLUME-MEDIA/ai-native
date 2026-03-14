<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. openorg_users — platform-scoped user directory
        Schema::create('openorg_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cal_platform_id')->nullable()->constrained('cal_platforms')->nullOnDelete();
            $table->string('name')->nullable();
            $table->string('email');
            $table->string('phone')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['cal_platform_id', 'email']);
        });

        // 2. kanban_boards — link to a platform (optional)
        Schema::table('kanban_boards', function (Blueprint $table) {
            $table->foreignId('cal_platform_id')->nullable()->after('is_active')
                  ->constrained('cal_platforms')->nullOnDelete();
        });

        // 3. kanban_cards — link to user + track meeting source
        Schema::table('kanban_cards', function (Blueprint $table) {
            $table->foreignId('openorg_user_id')->nullable()->after('assignee')
                  ->constrained('openorg_users')->nullOnDelete();
            $table->unsignedBigInteger('source_meeting_id')->nullable()->after('openorg_user_id');
            $table->boolean('is_meeting_card')->default(false)->after('source_meeting_id');
        });

        // 4. cal_meetings — link to a user
        Schema::table('cal_meetings', function (Blueprint $table) {
            $table->foreignId('openorg_user_id')->nullable()->after('cal_platform_id')
                  ->constrained('openorg_users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cal_meetings', function (Blueprint $table) {
            $table->dropForeign(['openorg_user_id']);
            $table->dropColumn('openorg_user_id');
        });

        Schema::table('kanban_cards', function (Blueprint $table) {
            $table->dropForeign(['openorg_user_id']);
            $table->dropColumns(['openorg_user_id', 'source_meeting_id', 'is_meeting_card']);
        });

        Schema::table('kanban_boards', function (Blueprint $table) {
            $table->dropForeign(['cal_platform_id']);
            $table->dropColumn('cal_platform_id');
        });

        Schema::dropIfExists('openorg_users');
    }
};
