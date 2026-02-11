<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('code_editor_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('path_pattern'); // e.g., /app/Models/*.php
            $table->boolean('can_read')->default(false);
            $table->boolean('can_write')->default(false);
            $table->boolean('can_delete')->default(false);
            $table->boolean('can_execute')->default(false);
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0); // Higher = checked first
            $table->timestamps();

            // Indexes
            $table->index('user_id');
            $table->index('is_active');
            $table->index(['priority', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('code_editor_permissions');
    }
};
