<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();

            // Who requested — mirrors OTP auth pattern
            $table->string('user_table')->default('users');   // e.g. 'users', 'otp_users'
            $table->unsignedBigInteger('user_id')->nullable(); // null for anonymous/session-only

            $table->decimal('amount', 10, 2);                 // requested refund amount
            $table->string('issue_type')->default('other');   // wrong_item|missing_item|damaged|late|quality|other
            $table->text('reason');                           // user's description

            // Status lifecycle: pending → approved/rejected → refunded
            $table->string('status')->default('pending');     // pending|approved|rejected|refunded

            // Stripe
            $table->string('stripe_refund_id')->nullable();   // re_xxx from Stripe
            $table->boolean('auto_refunded')->default(false); // true if processed by auto-refund rule

            // Admin
            $table->text('admin_note')->nullable();
            $table->timestamp('processed_at')->nullable();    // when approved/rejected

            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->index(['user_table', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_refunds');
    }
};
