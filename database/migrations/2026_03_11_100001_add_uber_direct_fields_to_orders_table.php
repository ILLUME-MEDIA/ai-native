<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('uber_direct_delivery_id')->nullable()->after('doordash_tracking_url');
            $table->string('uber_direct_status')->nullable()->after('uber_direct_delivery_id');
            $table->string('uber_direct_tracking_url')->nullable()->after('uber_direct_status');
            $table->string('uber_direct_fee')->nullable()->after('uber_direct_tracking_url'); // cents
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'uber_direct_delivery_id',
                'uber_direct_status',
                'uber_direct_tracking_url',
                'uber_direct_fee',
            ]);
        });
    }
};
