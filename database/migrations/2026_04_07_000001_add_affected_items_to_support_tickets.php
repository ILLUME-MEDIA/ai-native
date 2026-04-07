<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            // Structured list of affected order items (menu item id, name, modifiers, qty)
            // Set by the frontend form when user selects specific items for refund/complaint.
            $table->json('affected_items')->nullable()->after('priority');
        });
    }

    public function down(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->dropColumn('affected_items');
        });
    }
};
