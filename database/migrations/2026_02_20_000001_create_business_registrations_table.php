<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_registrations', function (Blueprint $table) {
            $table->id();

            // Basic Info
            $table->string('business_name');
            $table->string('address')->nullable();
            $table->string('address_2')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('zip')->nullable();
            $table->string('country')->default('US');

            // Contact
            $table->string('contact_name');
            $table->string('contact_email');
            $table->string('contact_phone')->nullable();
            $table->string('website_url')->nullable();
            $table->string('menu_url')->nullable();

            // Business Hours (Mon–Sun open/close)
            $table->string('monday_open')->nullable();
            $table->string('monday_close')->nullable();
            $table->string('tuesday_open')->nullable();
            $table->string('tuesday_close')->nullable();
            $table->string('wednesday_open')->nullable();
            $table->string('wednesday_close')->nullable();
            $table->string('thursday_open')->nullable();
            $table->string('thursday_close')->nullable();
            $table->string('friday_open')->nullable();
            $table->string('friday_close')->nullable();
            $table->string('saturday_open')->nullable();
            $table->string('saturday_close')->nullable();
            $table->string('sunday_open')->nullable();
            $table->string('sunday_close')->nullable();

            // Description
            $table->text('bio')->nullable();

            // Media
            $table->string('image_url')->nullable();    // image/video upload
            $table->string('audio_url')->nullable();    // audio upload

            // Agreement / Signature
            $table->boolean('agreement_accepted')->default(false);
            $table->string('signature_name')->nullable();
            $table->text('signature_data')->nullable();   // base64 canvas PNG

            // Workflow
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->string('external_site_url')->nullable(); // where to redirect after approval
            $table->unsignedBigInteger('business_id')->nullable(); // set after approval → linked Business

            // Tracking
            $table->string('ip_address')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('contact_email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_registrations');
    }
};
