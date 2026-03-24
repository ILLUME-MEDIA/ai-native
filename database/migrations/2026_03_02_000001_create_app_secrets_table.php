<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_secrets', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();          // e.g. STRIPE_SECRET_KEY
            $table->text('value')->nullable();         // encrypted by model cast
            $table->string('group')->default('general'); // stripe, doordash, square, etc.
            $table->string('label')->nullable();       // human-readable: "Stripe Secret Key"
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_secrets');
    }
};
