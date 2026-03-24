<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL allows modifying nullability even with a FK — no drop needed
        DB::statement('ALTER TABLE openorg_users MODIFY COLUMN cal_platform_id BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE openorg_users MODIFY COLUMN cal_platform_id BIGINT UNSIGNED NOT NULL');
    }
};
