<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            // null = inherit global, 'none' = no fee, 'percentage' or 'fixed' = override
            $table->enum('platform_fee_override', ['inherit', 'none', 'percentage', 'fixed'])
                  ->default('inherit')
                  ->after('auto_accept')
                  ->comment('inherit=use global, none=disable, percentage/fixed=override value');
            $table->decimal('platform_fee_value', 10, 2)
                  ->nullable()
                  ->after('platform_fee_override')
                  ->comment('Override fee value (% or fixed amount)');
        });
    }

    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            $table->dropColumn(['platform_fee_override', 'platform_fee_value']);
        });
    }
};
