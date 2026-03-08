<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cal_meetings', function (Blueprint $table) {
            $table->unsignedBigInteger('openorg_user_id')->nullable()->after('cal_platform_id');
            $table->string('user_source')->nullable()->after('openorg_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('cal_meetings', function (Blueprint $table) {
            $table->dropColumn(['openorg_user_id', 'user_source']);
        });
    }
};
