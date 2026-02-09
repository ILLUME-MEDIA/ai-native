<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('ai_skills')) {
            Schema::create('ai_skills', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('description', 1024);
                $table->text('instructions');
                $table->json('allowed_tools')->nullable();
                $table->string('model')->nullable();
                $table->boolean('is_active')->default(true);
                $table->integer('priority')->default(0);
                $table->json('trigger_keywords')->nullable();
                $table->text('metadata')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_skills');
    }
};
