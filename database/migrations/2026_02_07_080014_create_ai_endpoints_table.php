<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('ai_endpoints')) {
            Schema::create('ai_endpoints', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('provider'); // openai, google, mistral, custom
                $table->text('api_key'); // Encrypted
                $table->string('base_url')->nullable();
                $table->string('default_model')->nullable();
                $table->boolean('auto_model_selection')->default(false);
                $table->boolean('is_active')->default(true);
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_endpoints');
    }
};
