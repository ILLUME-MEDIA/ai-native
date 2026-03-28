<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ds_page_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('page_id')->constrained('ds_site_pages')->cascadeOnDelete();
            // navbar | hero | carousel | cards | features | testimonials | cta | footer
            $table->string('section_type');
            $table->string('label')->nullable();       // custom display label
            $table->unsignedInteger('sort_order')->default(0);
            $table->json('settings')->nullable();      // section-specific JSON config
            $table->boolean('is_visible')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ds_page_sections');
    }
};
