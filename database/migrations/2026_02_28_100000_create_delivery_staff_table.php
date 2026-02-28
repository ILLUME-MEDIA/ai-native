<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->nullable()->constrained('businesses')->onDelete('set null');
            $table->string('name');
            $table->string('phone')->unique();
            $table->string('email')->nullable();
            $table->string('pin', 6)->nullable()->comment('4-6 digit PIN for driver app login');
            $table->string('api_token', 80)->nullable()->unique()->comment('Sanctum-style token for driver app');
            $table->enum('vehicle_type', ['bike', 'motorcycle', 'car', 'van', 'walk'])->default('bike');
            $table->string('vehicle_model')->nullable();
            $table->string('vehicle_plate')->nullable();
            $table->string('photo')->nullable();
            $table->enum('status', ['available', 'busy', 'offline'])->default('offline');
            $table->boolean('is_active')->default(true);
            $table->decimal('current_lat', 10, 7)->nullable();
            $table->decimal('current_lng', 10, 7)->nullable();
            $table->timestamp('location_updated_at')->nullable();
            $table->integer('total_deliveries')->default(0);
            $table->decimal('rating', 3, 2)->nullable()->comment('Average rating 1-5');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['business_id', 'status']);
            $table->index(['business_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_staff');
    }
};
