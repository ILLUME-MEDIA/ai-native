<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kanban_boards', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('color', 20)->default('#6366f1');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('kanban_columns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id')->constrained('kanban_boards')->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 20)->default('#e5e7eb');
            $table->unsignedInteger('position')->default(0);
            $table->unsignedInteger('wip_limit')->nullable();
            $table->timestamps();
        });

        Schema::create('kanban_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('column_id')->constrained('kanban_columns')->cascadeOnDelete();
            $table->foreignId('board_id')->constrained('kanban_boards')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('priority')->default('medium'); // low, medium, high, urgent
            $table->date('due_date')->nullable();
            $table->string('assignee')->nullable();
            $table->json('labels')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kanban_cards');
        Schema::dropIfExists('kanban_columns');
        Schema::dropIfExists('kanban_boards');
    }
};
