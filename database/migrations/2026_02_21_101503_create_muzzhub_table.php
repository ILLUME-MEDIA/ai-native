<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('muzzhub', function (Blueprint $table) {
            $table->id();
            $table->boolean('yelp_verified')->default(false);

            // Basic info
            $table->text('name')->nullable();
            $table->string('slug', 255)->nullable()->unique();
            $table->text('type')->nullable();
            $table->text('description')->nullable();
            $table->text('cuisine')->nullable();

            // Location
            $table->text('address')->nullable();
            $table->text('address_2')->nullable();
            $table->text('city')->nullable();
            $table->text('state')->nullable();
            $table->text('zip')->nullable();
            $table->text('country')->nullable()->default('us');
            $table->text('longitude')->nullable();
            $table->text('latitude')->nullable();

            // Contact
            $table->text('phone')->nullable();
            $table->text('mobile_phone')->nullable();
            $table->text('email')->nullable();
            $table->text('website')->nullable();

            // Media
            $table->text('logo')->nullable();
            $table->text('cover_image')->nullable();
            $table->text('permalink')->nullable();
            $table->text('restHash')->nullable();

            // Halal info
            $table->text('compliance')->nullable();
            $table->text('slaughter_method')->nullable();
            $table->text('halal_authority')->nullable();
            $table->text('halal_info')->nullable();
            $table->text('halal_options')->nullable();
            $table->text('halal_chain')->nullable();
            $table->text('halal_items')->nullable();
            $table->text('halal_menu')->nullable();
            $table->text('description_halal')->nullable();

            // Hours
            $table->text('monday_open')->nullable();
            $table->text('monday_close')->nullable();
            $table->text('tuesday_open')->nullable();
            $table->text('tuesday_close')->nullable();
            $table->text('wednesday_open')->nullable();
            $table->text('wednesday_close')->nullable();
            $table->text('thursday_open')->nullable();
            $table->text('thursday_close')->nullable();
            $table->text('friday_open')->nullable();
            $table->text('friday_close')->nullable();
            $table->text('saturday_open')->nullable();
            $table->text('saturday_close')->nullable();
            $table->text('sunday_open')->nullable();
            $table->text('sunday_close')->nullable();

            // Features (boolean)
            $table->boolean('alcohol')->default(false);
            $table->boolean('kids_menu')->default(false);
            $table->boolean('pray_space')->default(false);
            $table->boolean('organic')->default(false);
            $table->boolean('catering')->default(false);
            $table->boolean('delivery')->default(false);
            $table->boolean('wheelchair_access')->default(false);
            $table->boolean('wifi')->default(false);
            $table->boolean('cash_only')->default(false);
            $table->boolean('pork')->default(false);
            $table->boolean('featured')->default(false);
            $table->boolean('sponsored')->default(false);

            // Features (text/optional)
            $table->text('shisha')->nullable();
            $table->text('drive_thru')->nullable();
            $table->text('reservations')->nullable();
            $table->text('outdoor_seating')->nullable();
            $table->text('prayer')->nullable();
            $table->text('restrooms')->nullable();
            $table->text('wheelchair')->nullable();
            $table->text('credit_cards')->nullable();
            $table->text('amenities')->nullable();
            $table->text('alcohol_options')->nullable();

            // Ratings & stats
            $table->string('rating', 255)->nullable();
            $table->text('review_count')->nullable();
            $table->text('followers')->nullable();
            $table->text('following')->nullable();
            $table->text('total_ratings')->nullable();
            $table->text('photo_count')->nullable();

            // Other details
            $table->text('price')->nullable();
            $table->text('parking')->nullable();
            $table->text('parking_zhalal')->nullable();
            $table->text('transit')->nullable();
            $table->text('timezone')->nullable();
            $table->text('comments')->nullable();
            $table->text('ownedBy')->nullable();
            $table->text('related')->nullable();
            $table->text('associated_listings')->nullable();
            $table->text('featured_heading')->nullable();
            $table->text('featured_tiles')->nullable();

            // Order/booking
            $table->boolean('enable_order')->default(false);
            $table->boolean('enable_order_print')->default(false);
            $table->boolean('enable_stripe')->default(false);
            $table->boolean('adjust_platform_fee')->default(false);
            $table->boolean('is_online')->default(false);
            $table->text('booking')->nullable();
            $table->text('booking_slot_value')->nullable();
            $table->text('platforms')->nullable();
            $table->text('order_online_link')->nullable();
            $table->text('delivery_fee_discount')->nullable();
            $table->text('offline_record_time')->nullable();

            // Extra
            $table->text('capacity')->nullable();
            $table->text('to_go')->nullable();
            $table->text('demographics')->nullable();
            $table->text('kitchen')->nullable();
            $table->boolean('restrict_checkin')->default(false);
            $table->boolean('created_app_user')->default(false);
            $table->dateTime('checkin_start')->nullable();
            $table->dateTime('checkin_end')->nullable();
            $table->dateTime('start_date')->nullable();
            $table->dateTime('end_date')->nullable();
            $table->dateTime('closedDate')->nullable();
            $table->unsignedInteger('createdByUserNum')->default(0);
            $table->unsignedInteger('updatedByUserNum')->default(0);

            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('muzzhub');
    }
};
