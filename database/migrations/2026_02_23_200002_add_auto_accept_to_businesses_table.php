<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            if (! Schema::hasColumn('businesses', 'auto_accept')) {
                $table->boolean('auto_accept')->default(false)->after('is_active')
                    ->comment('Auto-accept orders and trigger DoorDash dispatch immediately');
            }
        });
    }

    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            if (Schema::hasColumn('businesses', 'auto_accept')) {
                $table->dropColumn('auto_accept');
            }
        });
    }
};
