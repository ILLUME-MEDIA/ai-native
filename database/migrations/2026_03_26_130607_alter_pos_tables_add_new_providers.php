<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const PROVIDERS = "'square','clover','toast','spoton','poslavu','deliverect'";

    public function up(): void
    {
        // MySQL: MODIFY COLUMN to extend enum — preserves existing data
        DB::statement("ALTER TABLE pos_connections  MODIFY COLUMN provider ENUM(" . self::PROVIDERS . ") NOT NULL");
        DB::statement("ALTER TABLE pos_catalog_maps MODIFY COLUMN provider ENUM(" . self::PROVIDERS . ") NOT NULL");
        DB::statement("ALTER TABLE pos_orders       MODIFY COLUMN provider ENUM(" . self::PROVIDERS . ") NOT NULL");
    }

    public function down(): void
    {
        // Revert to original two providers (only safe if no rows use new providers)
        DB::statement("ALTER TABLE pos_connections  MODIFY COLUMN provider ENUM('square','clover') NOT NULL");
        DB::statement("ALTER TABLE pos_catalog_maps MODIFY COLUMN provider ENUM('square','clover') NOT NULL");
        DB::statement("ALTER TABLE pos_orders       MODIFY COLUMN provider ENUM('square','clover') NOT NULL");
    }
};
