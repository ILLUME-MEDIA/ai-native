<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mcp_servers', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->text('description');
            $table->string('category'); // ai | data | devops | browser | communication | tools
            $table->string('author')->default('anthropic');
            $table->json('command');       // { "command": "npx", "args": [...] }
            $table->json('args_schema')->nullable();  // { key: { type, label, description } }
            $table->json('env_schema')->nullable();   // { ENV_KEY: { type, label, required, description } }
            $table->string('npm_package')->nullable();
            $table->string('docs_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mcp_servers');
    }
};
