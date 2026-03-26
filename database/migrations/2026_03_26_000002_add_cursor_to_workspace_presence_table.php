<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspace_presence', function (Blueprint $table) {
            $table->unsignedInteger('cursor_line')->nullable()->after('open_file');
            $table->unsignedInteger('cursor_col')->nullable()->after('cursor_line');
        });
    }

    public function down(): void
    {
        Schema::table('workspace_presence', function (Blueprint $table) {
            $table->dropColumn(['cursor_line', 'cursor_col']);
        });
    }
};
