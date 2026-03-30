<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();

            // Who opened — mirrors OTP auth pattern
            $table->string('user_table')->default('users');
            $table->unsignedBigInteger('user_id')->nullable();

            // Ticket meta
            $table->string('ticket_number')->unique();   // e.g. TKT-00123
            $table->string('subject');
            $table->string('category')->default('general'); // general|refund|delivery|quality|other
            $table->string('status')->default('open');       // open|in_progress|resolved|closed
            $table->string('priority')->default('medium');   // low|medium|high|urgent

            // Resolution
            $table->text('resolution_note')->nullable();
            $table->timestamp('resolved_at')->nullable();

            // Unread counts for both sides
            $table->unsignedInteger('unread_admin')->default(0);
            $table->unsignedInteger('unread_user')->default(0);

            $table->timestamps();

            $table->index(['user_table', 'user_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};
