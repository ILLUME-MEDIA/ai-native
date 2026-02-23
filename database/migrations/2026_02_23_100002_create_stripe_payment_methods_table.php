<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stripe_payment_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stripe_customer_id')->constrained('stripe_customers')->cascadeOnDelete();
            $table->string('stripe_pm_id')->unique(); // pm_xxx from Stripe
            $table->string('brand')->nullable();       // visa, mastercard, etc.
            $table->string('last4', 4)->nullable();
            $table->unsignedTinyInteger('exp_month')->nullable();
            $table->unsignedSmallInteger('exp_year')->nullable();
            $table->string('cardholder_name')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index('stripe_pm_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_payment_methods');
    }
};
