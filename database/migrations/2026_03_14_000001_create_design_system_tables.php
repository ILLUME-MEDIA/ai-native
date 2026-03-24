<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Themes ──────────────────────────────────────────────────
        Schema::create('ds_themes', function (Blueprint $table) {
            $table->id();
            $table->string('name');           // e.g. "Default", "Dark", "Brand A"
            $table->string('slug')->unique(); // e.g. "default"
            $table->boolean('is_default')->default(false);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // ── Design Tokens ────────────────────────────────────────────
        Schema::create('ds_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('theme_id')->constrained('ds_themes')->cascadeOnDelete();
            $table->string('name');           // e.g. "color.primary"
            $table->string('category');       // color | spacing | radius | shadow | font | opacity | border
            $table->string('value');          // e.g. "#3b82f6" or "8px" or "500"
            $table->string('type')->default('static'); // static | alias (alias refs another token)
            $table->string('alias_of')->nullable();    // token name this aliases
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['theme_id', 'name']);
            $table->index(['theme_id', 'category']);
        });

        // ── Component Definitions ─────────────────────────────────────
        Schema::create('ds_components', function (Blueprint $table) {
            $table->id();
            $table->string('name');           // e.g. "Button"
            $table->string('slug')->unique(); // e.g. "button"
            $table->string('type');           // button | input | card | modal | badge | alert | tab
            $table->text('description')->nullable();
            $table->json('base_props')->nullable(); // default HTML props/attributes
            $table->timestamps();
        });

        // ── Component Variants ────────────────────────────────────────
        Schema::create('ds_component_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('component_id')->constrained('ds_components')->cascadeOnDelete();
            $table->string('variant_name');    // e.g. "primary"
            $table->string('style_modifier')->nullable(); // e.g. "outline", "soft", "ghost", "gradient"
            $table->string('size')->nullable(); // sm | md | lg
            // token_mapping: { "background": "color.primary", "color": "color.white", ... }
            $table->json('token_mapping');
            // static_classes: ["rounded-full", "font-semibold"] — non-token Tailwind classes
            $table->json('static_classes')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['component_id', 'variant_name', 'style_modifier', 'size'], 'variant_unique');
            $table->index('component_id');
        });

        // ── Token Groups (for UI organization) ───────────────────────
        Schema::create('ds_token_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('theme_id')->constrained('ds_themes')->cascadeOnDelete();
            $table->string('name');           // e.g. "Brand Colors", "Spacing Scale"
            $table->string('category');
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        $table = null;

        // ── Token → Group mapping ─────────────────────────────────────
        Schema::create('ds_token_group_items', function (Blueprint $table) {
            $table->foreignId('token_id')->constrained('ds_tokens')->cascadeOnDelete();
            $table->foreignId('group_id')->constrained('ds_token_groups')->cascadeOnDelete();
            $table->primary(['token_id', 'group_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ds_token_group_items');
        Schema::dropIfExists('ds_token_groups');
        Schema::dropIfExists('ds_component_variants');
        Schema::dropIfExists('ds_components');
        Schema::dropIfExists('ds_tokens');
        Schema::dropIfExists('ds_themes');
    }
};
