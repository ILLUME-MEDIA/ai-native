<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_genres', function (Blueprint $table) {
            $table->id();
            $table->string('platform_name')->unique();
            $table->json('genres')->default('[]');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Seed from existing config
        $platformGenres = config('platform_genres', []);
        $order = 0;
        foreach ((array) $platformGenres as $platform => $genres) {
            \DB::table('platform_genres')->insert([
                'platform_name' => $platform,
                'genres'        => json_encode($genres),
                'sort_order'    => $order++,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_genres');
    }
};
