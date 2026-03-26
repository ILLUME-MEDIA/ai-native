<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('file_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('file_path');
            $table->longText('content');
            $table->timestamps();

            $table->index(['workspace_id', 'file_path', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('file_snapshots');
    }
};
