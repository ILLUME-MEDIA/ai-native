<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_status')->default('unpaid')->after('status');
            // enum: unpaid | paid | failed | refunded
            $table->string('payment_method')->nullable()->after('payment_status');
            // e.g. stripe_card | cod
            $table->string('stripe_payment_intent_id')->nullable()->after('payment_method');
            $table->timestamp('paid_at')->nullable()->after('stripe_payment_intent_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['payment_status', 'payment_method', 'stripe_payment_intent_id', 'paid_at']);
        });
    }
};
