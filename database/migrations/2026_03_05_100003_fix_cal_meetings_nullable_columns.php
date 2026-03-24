<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cal_meetings', function (Blueprint $table) {
            $table->dateTime('start_time')->nullable()->change();
            $table->dateTime('end_time')->nullable()->change();
            $table->string('attendee_name')->nullable()->change();
            $table->string('attendee_email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('cal_meetings', function (Blueprint $table) {
            $table->dateTime('start_time')->nullable(false)->change();
            $table->dateTime('end_time')->nullable(false)->change();
            $table->string('attendee_name')->nullable(false)->change();
            $table->string('attendee_email')->nullable(false)->change();
        });
    }
};
