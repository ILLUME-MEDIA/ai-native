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
        Schema::create('ai_command_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('command_type'); // file_edit, file_create, file_delete, terminal_command, git_operation
            $table->text('command');
            $table->json('affected_files')->nullable();
            $table->longText('original_content')->nullable();
            $table->longText('new_content')->nullable();
            $table->text('diff')->nullable();
            $table->text('ai_explanation')->nullable();
            $table->string('status')->default('pending'); // pending, approved, rejected, expired
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->json('execution_result')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_command_approvals');
    }
};
