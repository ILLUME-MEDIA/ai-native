<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cal_meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cal_platform_id')->constrained('cal_platforms')->cascadeOnDelete();
            $table->string('booking_uid')->nullable()->index();   // Cal.com booking UID
            $table->string('event_type_id')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('attendee_name');
            $table->string('attendee_email');
            $table->string('attendee_timezone')->nullable();
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->string('status')->default('upcoming'); // upcoming, completed, cancelled, rescheduled
            $table->string('meeting_url')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cal_meetings');
    }
};
