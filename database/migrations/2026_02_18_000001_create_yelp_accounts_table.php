<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yelp_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('api_key');
            $table->unsignedInteger('daily_limit')->default(500);
            $table->unsignedInteger('requests_today')->default(0);
            $table->timestamp('last_reset_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yelp_accounts');
    }
};
