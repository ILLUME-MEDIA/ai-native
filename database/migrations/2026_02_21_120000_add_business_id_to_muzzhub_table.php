<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('muzzhub', function (Blueprint $table) {
            $table->unsignedBigInteger('business_id')->nullable()->after('category_id');
            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('set null');
            $table->unique('business_id');
        });
    }

    public function down(): void
    {
        Schema::table('muzzhub', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
            $table->dropUnique(['business_id']);
        });
    }
};
