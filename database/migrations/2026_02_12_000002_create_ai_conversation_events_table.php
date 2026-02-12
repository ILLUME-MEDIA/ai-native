<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ai_conversation_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('ai_conversations')->cascadeOnDelete();

            // e.g. user_message, status, chunk (optional), tool_call, tool_result, file_tree_changed, assistant_message, error, done
            $table->string('type', 64)->index();
            $table->json('payload')->nullable();

            $table->timestamps();

            $table->index(['conversation_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_conversation_events');
    }
};

