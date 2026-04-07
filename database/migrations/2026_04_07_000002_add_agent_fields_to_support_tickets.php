<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->boolean('agent_handled')->default(false)->after('affected_items');
            $table->unsignedSmallInteger('refund_intent_count')->default(0)->after('agent_handled');
        });
    }

    public function down(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->dropColumn(['agent_handled', 'refund_intent_count']);
        });
    }
};
