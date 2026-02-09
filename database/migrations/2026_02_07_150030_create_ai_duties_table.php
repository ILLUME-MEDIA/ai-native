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
        if (!Schema::hasTable('ai_duties')) {
            Schema::create('ai_duties', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->text('description')->nullable();
                $table->text('instructions');
                $table->string('schedule_type')->default('interval');
                $table->string('schedule_value')->nullable();
                $table->json('execution_data')->nullable();
                $table->json('last_result')->nullable();
                $table->timestamp('last_executed_at')->nullable();
                $table->timestamp('next_execution_at')->nullable();
                $table->boolean('is_active')->default(true);
                $table->integer('priority')->default(0);
                $table->integer('execution_count')->default(0);
                $table->integer('success_count')->default(0);
                $table->integer('failure_count')->default(0);
                $table->string('status')->default('pending');
                $table->text('error_message')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_duties');
    }
};
