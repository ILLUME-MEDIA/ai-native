<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            // Location
            $table->string('address_2')->nullable()->after('address');
            $table->string('zip', 20)->nullable()->after('state');
            $table->string('country', 10)->nullable()->default('us')->after('zip');

            // Contact
            $table->string('website')->nullable()->after('email');

            // Business details
            $table->string('cuisine')->nullable()->after('description');
            $table->string('compliance')->nullable()->after('cuisine');
            $table->string('slaughter_method')->nullable()->after('compliance');
            $table->string('halal_authority')->nullable()->after('slaughter_method');
            $table->text('halal_info')->nullable()->after('halal_authority');
            $table->string('halal_options')->nullable()->after('halal_info');
            $table->string('halal_chain')->nullable()->after('halal_options');
            $table->string('price', 10)->nullable()->after('halal_chain');
            $table->string('parking')->nullable()->after('price');
            $table->string('credit_cards')->nullable()->after('parking');
            $table->string('transit')->nullable()->after('credit_cards');
            $table->string('permalink')->nullable()->after('transit');

            // Stats
            $table->decimal('rating', 3, 1)->nullable()->after('permalink');
            $table->integer('review_count')->default(0)->after('rating');

            // Boolean features
            $table->boolean('alcohol')->default(false)->after('review_count');
            $table->boolean('kids_menu')->default(false)->after('alcohol');
            $table->boolean('pray_space')->default(false)->after('kids_menu');
            $table->boolean('organic')->default(false)->after('pray_space');
            $table->boolean('catering')->default(false)->after('organic');
            $table->boolean('delivery')->default(false)->after('catering');
            $table->boolean('wheelchair_access')->default(false)->after('delivery');
            $table->boolean('wifi')->default(false)->after('wheelchair_access');
            $table->boolean('cash_only')->default(false)->after('wifi');
            $table->boolean('pork')->default(false)->after('cash_only');
            $table->boolean('drive_thru')->default(false)->after('pork');
            $table->boolean('reservations')->default(false)->after('drive_thru');
            $table->boolean('outdoor_seating')->default(false)->after('reservations');
            $table->boolean('shisha')->default(false)->after('outdoor_seating');
            $table->boolean('featured')->default(false)->after('shisha');
            $table->boolean('sponsored')->default(false)->after('featured');

            // Business hours
            $table->string('monday_open', 10)->nullable()->after('sponsored');
            $table->string('monday_close', 10)->nullable()->after('monday_open');
            $table->string('tuesday_open', 10)->nullable()->after('monday_close');
            $table->string('tuesday_close', 10)->nullable()->after('tuesday_open');
            $table->string('wednesday_open', 10)->nullable()->after('tuesday_close');
            $table->string('wednesday_close', 10)->nullable()->after('wednesday_open');
            $table->string('thursday_open', 10)->nullable()->after('wednesday_close');
            $table->string('thursday_close', 10)->nullable()->after('thursday_open');
            $table->string('friday_open', 10)->nullable()->after('thursday_close');
            $table->string('friday_close', 10)->nullable()->after('friday_open');
            $table->string('saturday_open', 10)->nullable()->after('friday_close');
            $table->string('saturday_close', 10)->nullable()->after('saturday_open');
            $table->string('sunday_open', 10)->nullable()->after('saturday_close');
            $table->string('sunday_close', 10)->nullable()->after('sunday_open');
        });
    }

    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            $table->dropColumn([
                'address_2','zip','country','website',
                'cuisine','compliance','slaughter_method','halal_authority',
                'halal_info','halal_options','halal_chain',
                'price','parking','credit_cards','transit','permalink',
                'rating','review_count',
                'alcohol','kids_menu','pray_space','organic','catering',
                'delivery','wheelchair_access','wifi','cash_only','pork',
                'drive_thru','reservations','outdoor_seating','shisha',
                'featured','sponsored',
                'monday_open','monday_close','tuesday_open','tuesday_close',
                'wednesday_open','wednesday_close','thursday_open','thursday_close',
                'friday_open','friday_close','saturday_open','saturday_close',
                'sunday_open','sunday_close',
            ]);
        });
    }
};
