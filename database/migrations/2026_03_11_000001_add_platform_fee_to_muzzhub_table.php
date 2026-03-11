<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('muzzhub', function (Blueprint $table) {
            $table->enum('platform_fee_override', ['inherit', 'none', 'percentage', 'fixed'])
                  ->default('inherit')
                  ->after('adjust_platform_fee');
            $table->decimal('platform_fee_value', 10, 2)
                  ->nullable()
                  ->after('platform_fee_override');
        });
    }

    public function down(): void
    {
        Schema::table('muzzhub', function (Blueprint $table) {
            $table->dropColumn(['platform_fee_override', 'platform_fee_value']);
        });
    }
};
