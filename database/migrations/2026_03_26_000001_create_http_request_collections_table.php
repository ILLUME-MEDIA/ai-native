<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('http_request_collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 7)->default('#ff6b35');
            $table->timestamps();
        });

        Schema::create('http_saved_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collection_id')->constrained('http_request_collections')->cascadeOnDelete();
            $table->string('name');
            $table->string('method', 10)->default('GET');
            $table->string('url');
            $table->json('headers')->nullable();
            $table->json('params')->nullable();
            $table->text('body')->nullable();
            $table->string('body_type', 20)->default('none'); // none | json | form | raw
            $table->string('auth_type', 20)->default('none'); // none | bearer | basic | apikey
            $table->json('auth_data')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('http_saved_requests');
        Schema::dropIfExists('http_request_collections');
    }
};
