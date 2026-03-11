<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Disable strict mode for this session — the muzzhub table has a
        // legacy start_date column with a zero-date default that MySQL strict
        // mode rejects during ALTER TABLE. We restore sql_mode afterwards.
        $originalMode = DB::select("SELECT @@SESSION.sql_mode as mode")[0]->mode;
        DB::statement("SET SESSION sql_mode=''");

        Schema::table('muzzhub', function (Blueprint $table) {
            $table->enum('platform_fee_override', ['inherit', 'none', 'percentage', 'fixed'])
                  ->default('inherit')
                  ->after('adjust_platform_fee');
            $table->decimal('platform_fee_value', 10, 2)
                  ->nullable()
                  ->after('platform_fee_override');
        });

        DB::statement("SET SESSION sql_mode='{$originalMode}'");
    }

    public function down(): void
    {
        Schema::table('muzzhub', function (Blueprint $table) {
            $table->dropColumn(['platform_fee_override', 'platform_fee_value']);
        });
    }
};
