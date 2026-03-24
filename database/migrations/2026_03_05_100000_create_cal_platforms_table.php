<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cal_platforms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('api_key')->nullable();          // encrypted
            $table->string('base_url')->default('https://api.cal.com/v2');
            $table->text('webhook_secret')->nullable();   // encrypted
            $table->string('color', 20)->default('#6366f1');
            $table->json('settings')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cal_platforms');
    }
};
