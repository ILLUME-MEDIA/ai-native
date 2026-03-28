<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ds_site_pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('ds_sites')->cascadeOnDelete();
            $table->string('name');                    // "Home", "About", "Menu"
            $table->string('slug');                    // "home", "about", "menu"
            $table->string('title')->nullable();       // <title> tag override
            $table->text('meta_description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('theme_id')->nullable()->constrained('ds_themes')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['site_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ds_site_pages');
    }
};
