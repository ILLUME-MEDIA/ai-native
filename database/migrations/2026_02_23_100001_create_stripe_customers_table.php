<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stripe_customers', function (Blueprint $table) {
            $table->id();
            $table->string('user_table')->default('users'); // which table: users, discovery_users
            $table->unsignedBigInteger('user_id');
            $table->string('stripe_customer_id')->unique();
            $table->string('email')->nullable();
            $table->timestamps();

            $table->unique(['user_table', 'user_id']);
            $table->index('stripe_customer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_customers');
    }
};
