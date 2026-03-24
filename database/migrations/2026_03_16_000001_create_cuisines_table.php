<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cuisines', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->string('icon')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('muzzhub_cuisine', function (Blueprint $table) {
            $table->foreignId('muzzhub_id')->constrained('muzzhub')->onDelete('cascade');
            $table->foreignId('cuisine_id')->constrained('cuisines')->onDelete('cascade');
            $table->primary(['muzzhub_id', 'cuisine_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('muzzhub_cuisine');
        Schema::dropIfExists('cuisines');
    }
};
