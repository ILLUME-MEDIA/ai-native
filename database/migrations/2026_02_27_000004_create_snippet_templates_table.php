<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('snippet_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('trigger', 50);
            $table->string('language', 50)->default('*'); // '*' = all languages
            $table->text('body');
            $table->string('description')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'language']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('snippet_templates');
    }
};
