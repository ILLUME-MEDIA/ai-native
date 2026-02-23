<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'doordash_delivery_id')) {
                $table->string('doordash_delivery_id')->nullable()->after('stripe_payment_intent_id');
            }
            if (! Schema::hasColumn('orders', 'doordash_status')) {
                $table->string('doordash_status')->nullable()->after('doordash_delivery_id');
            }
            if (! Schema::hasColumn('orders', 'doordash_tracking_url')) {
                $table->string('doordash_tracking_url')->nullable()->after('doordash_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['doordash_delivery_id', 'doordash_status', 'doordash_tracking_url']);
        });
    }
};
