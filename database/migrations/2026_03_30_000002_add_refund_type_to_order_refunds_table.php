<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_refunds', function (Blueprint $table) {
            // full | platform_fee | tip | subtotal | partial | items
            $table->string('refund_type')->default('full')->after('reason');
            // JSON array of order_item IDs when refund_type = 'items'
            $table->json('refund_item_ids')->nullable()->after('refund_type');
        });
    }

    public function down(): void
    {
        Schema::table('order_refunds', function (Blueprint $table) {
            $table->dropColumn(['refund_type', 'refund_item_ids']);
        });
    }
};
