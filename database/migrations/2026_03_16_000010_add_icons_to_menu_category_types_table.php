<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('menu_category_types', function (Blueprint $table) {
            $table->string('icon')->nullable()->after('description');
            $table->string('hover_icon')->nullable()->after('icon');
        });
    }

    public function down(): void
    {
        Schema::table('menu_category_types', function (Blueprint $table) {
            $table->dropColumn(['icon', 'hover_icon']);
        });
    }
};
