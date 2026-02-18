<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discovery_users', function (Blueprint $table) {

            $table->id();

            // ── Core Profile ──────────────────────────────────────────────
            $table->string('name')->nullable();
            $table->string('email')->unique()->nullable();
            $table->string('photo')->nullable();          // URL or path to avatar/profile photo
            $table->text('bio')->nullable();
            $table->string('phone', 30)->nullable();

            // ── Location (from GPS or IP-based geo) ───────────────────────
            $table->decimal('lat', 10, 7)->nullable();   // GPS latitude
            $table->decimal('lng', 10, 7)->nullable();   // GPS longitude
            $table->string('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('zip', 20)->nullable();
            $table->string('country', 100)->nullable();
            $table->char('country_code', 2)->nullable(); // ISO 3166-1 alpha-2 (e.g. PK, US)
            $table->boolean('location_from_gps')->default(false); // true=GPS, false=IP-based

            // ── Network ───────────────────────────────────────────────────
            $table->string('ip_address', 45)->nullable();   // supports IPv6
            $table->string('isp')->nullable();               // Internet Service Provider
            $table->string('connection_type', 20)->nullable(); // 4g / 3g / 2g / wifi / ethernet
            $table->unsignedSmallInteger('downlink')->nullable(); // Mbps approx
            $table->unsignedSmallInteger('rtt')->nullable();      // Round-trip time ms

            // ── Browser ───────────────────────────────────────────────────
            $table->string('browser', 50)->nullable();          // Chrome / Firefox / Safari …
            $table->string('browser_version', 30)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('language', 20)->nullable();         // en-US
            $table->string('languages')->nullable();            // en-US,en,ur  (comma-sep)
            $table->string('timezone', 60)->nullable();         // Asia/Karachi
            $table->boolean('cookies_enabled')->nullable();
            $table->boolean('do_not_track')->nullable();
            $table->string('referrer')->nullable();

            // ── Device & OS ───────────────────────────────────────────────
            $table->string('device_type', 20)->nullable();      // desktop / mobile / tablet
            $table->string('os', 50)->nullable();               // Windows / Android / iOS …
            $table->string('os_version', 30)->nullable();
            $table->string('platform', 30)->nullable();         // Win32 / Linux / iPhone …
            $table->unsignedTinyInteger('hardware_concurrency')->nullable(); // CPU cores
            $table->unsignedTinyInteger('device_memory')->nullable();        // RAM in GB (approx)
            $table->unsignedSmallInteger('screen_width')->nullable();
            $table->unsignedSmallInteger('screen_height')->nullable();
            $table->decimal('pixel_ratio', 4, 2)->nullable();   // device pixel ratio
            $table->unsignedTinyInteger('color_depth')->nullable(); // bits

            // ── Fingerprint ───────────────────────────────────────────────
            $table->string('fingerprint', 64)->nullable()->index(); // canvas/audio hash
            $table->string('webgl_renderer')->nullable();           // GPU model string
            $table->string('webgl_vendor')->nullable();

            // ── Timestamps & Status ───────────────────────────────────────
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();                               // created_at / updated_at
            $table->softDeletes();

            // ── Indexes ───────────────────────────────────────────────────
            $table->index('ip_address');
            $table->index('country_code');
            $table->index('city');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discovery_users');
    }
};
