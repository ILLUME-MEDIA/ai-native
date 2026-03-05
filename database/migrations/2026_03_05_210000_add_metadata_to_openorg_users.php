<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('openorg_users', function (Blueprint $table) {
            $table->json('metadata')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('openorg_users', function (Blueprint $table) {
            $table->dropColumn('metadata');
        });
    }
};
