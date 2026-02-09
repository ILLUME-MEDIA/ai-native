<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('section_fields', function (Blueprint $table) {
            $table->foreignId('related_entity_id')->nullable()->after('type')->constrained('section_entities')->nullOnDelete();
            $table->string('relation_type', 32)->nullable()->after('related_entity_id');
            $table->string('relation_display_column', 64)->nullable()->after('relation_type');
        });
    }

    public function down(): void
    {
        Schema::table('section_fields', function (Blueprint $table) {
            $table->dropForeign(['related_entity_id']);
            $table->dropColumn(['relation_type', 'relation_display_column']);
        });
    }
};
