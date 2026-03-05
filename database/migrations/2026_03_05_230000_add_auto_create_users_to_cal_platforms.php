<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cal_platforms', function (Blueprint $table) {
            $table->boolean('auto_create_users')->default(false)->after('users_entity_id');
        });
    }

    public function down(): void
    {
        Schema::table('cal_platforms', function (Blueprint $table) {
            $table->dropColumn('auto_create_users');
        });
    }
};
