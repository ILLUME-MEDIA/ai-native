<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\Muzzhub;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MuzzhubController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Muzzhub::with(['category:id,name,slug,color,icon', 'business:id,name,slug'])->orderBy('name');

        if ($request->filled('search'))        $q->where('name', 'like', '%' . $request->search . '%');
        if ($request->boolean('active_only'))  $q->where('is_active', true);
        if ($request->filled('type'))          $q->where('type', $request->type);
        if ($request->filled('city'))          $q->where('city', 'like', '%' . $request->city . '%');
        if ($request->filled('country'))       $q->where('country', $request->country);
        if ($request->boolean('delivery'))     $q->where('delivery', true);
        if ($request->boolean('featured'))     $q->where('featured', true);
        if ($request->filled('category_id'))   $q->where('category_id', $request->category_id);

        return response()->json($q->paginate($request->input('per_page', 15)));
    }

    public function show(Muzzhub $muzzhub): JsonResponse
    {
        return response()->json($muzzhub->load(['category:id,name,slug,color,icon', 'business']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $data['slug'] = $this->resolveSlug($request->input('slug'), $data['name']);
        $record = Muzzhub::create($data);
        $this->syncAutoAcceptToBusiness($record);
        return response()->json($record, 201);
    }

    public function update(Request $request, Muzzhub $muzzhub): JsonResponse
    {
        $data = $request->validate($this->rules('update', $muzzhub->id));
        if ($request->filled('slug')) {
            $data['slug'] = $this->resolveSlug($request->input('slug'), $data['name'] ?? $muzzhub->name, $muzzhub->id);
        }
        $muzzhub->update($data);
        $this->syncAutoAcceptToBusiness($muzzhub->fresh());
        return response()->json($muzzhub);
    }

    /**
     * When auto_accept changes on a Muzzhub listing, sync it to the linked Business
     * so that OrderController can check $order->business->auto_accept.
     */
    private function syncAutoAcceptToBusiness(Muzzhub $muzzhub): void
    {
        if ($muzzhub->business_id) {
            Business::where('id', $muzzhub->business_id)
                ->update(['auto_accept' => (bool) $muzzhub->auto_accept]);
        }
    }

    public function destroy(Muzzhub $muzzhub): JsonResponse
    {
        $muzzhub->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    private function rules(string $mode = 'create', ?int $ignoreId = null): array
    {
        $slugUnique = 'unique:muzzhub,slug' . ($ignoreId ? ",{$ignoreId}" : '');
        $req = $mode === 'create' ? 'required' : 'sometimes';
        return [
            // Basic
            'category_id'      => 'nullable|integer|exists:muzzhub_categories,id',
            'business_id'      => 'nullable|integer|exists:businesses,id',
            'name'             => "{$req}|string|max:255",
            'slug'             => "nullable|string|max:255|{$slugUnique}",
            'type'             => 'nullable|string|max:100',
            'cuisine'          => 'nullable|string|max:500',
            'description'      => 'nullable|string',
            'price'            => 'nullable|string|max:10',
            'yelp_verified'    => 'boolean',
            'is_active'        => 'boolean',
            'rating'           => 'nullable|string|max:20',
            'review_count'     => 'nullable|string',
            'photo_count'      => 'nullable|string',
            // Location
            'address'          => 'nullable|string|max:500',
            'address_2'        => 'nullable|string|max:500',
            'city'             => 'nullable|string|max:100',
            'state'            => 'nullable|string|max:100',
            'zip'              => 'nullable|string|max:30',
            'country'          => 'nullable|string|max:10',
            'latitude'         => 'nullable|numeric',
            'longitude'        => 'nullable|numeric',
            'timezone'         => 'nullable|string|max:100',
            'transit'          => 'nullable|string',
            'parking'          => 'nullable|string',
            'parking_zhalal'   => 'nullable|string',
            // Contact
            'phone'            => 'nullable|string|max:50',
            'mobile_phone'     => 'nullable|string|max:50',
            'email'            => 'nullable|email|max:200',
            'website'          => 'nullable|string|max:500',
            'comments'         => 'nullable|string',
            'ownedBy'          => 'nullable|string',
            'capacity'         => 'nullable|string',
            // Media
            'logo'             => 'nullable|string',
            'cover_image'      => 'nullable|string',
            'permalink'        => 'nullable|string',
            'restHash'         => 'nullable|string',
            'featured_heading' => 'nullable|string',
            'featured_tiles'   => 'nullable|string',
            // Halal
            'compliance'         => 'nullable|string|max:200',
            'slaughter_method'   => 'nullable|string|max:200',
            'halal_authority'    => 'nullable|string|max:200',
            'halal_info'         => 'nullable|string',
            'halal_options'      => 'nullable|string',
            'halal_chain'        => 'nullable|string|max:200',
            'halal_items'        => 'nullable|string',
            'halal_menu'         => 'nullable|string',
            'description_halal'  => 'nullable|string',
            // Boolean features
            'alcohol'            => 'boolean',
            'kids_menu'          => 'boolean',
            'pray_space'         => 'boolean',
            'organic'            => 'boolean',
            'catering'           => 'boolean',
            'delivery'           => 'boolean',
            'wheelchair_access'  => 'boolean',
            'wifi'               => 'boolean',
            'cash_only'          => 'boolean',
            'pork'               => 'boolean',
            'featured'           => 'boolean',
            'sponsored'          => 'boolean',
            'enable_order'       => 'boolean',
            'enable_order_print' => 'boolean',
            'enable_stripe'      => 'boolean',
            'adjust_platform_fee'    => 'boolean',
            'platform_fee_override'  => 'nullable|in:inherit,none,percentage,fixed',
            'platform_fee_value'     => 'nullable|numeric|min:0',
            'is_online'              => 'boolean',
            'restrict_checkin'   => 'boolean',
            'created_app_user'   => 'boolean',
            'auto_accept'        => 'boolean',
            // Text features
            'shisha'          => 'nullable|string',
            'drive_thru'      => 'nullable|string',
            'reservations'    => 'nullable|string',
            'outdoor_seating' => 'nullable|string',
            'prayer'          => 'nullable|string',
            'restrooms'       => 'nullable|string',
            'wheelchair'      => 'nullable|string',
            'credit_cards'    => 'nullable|string',
            'amenities'       => 'nullable|string',
            'alcohol_options' => 'nullable|string',
            'to_go'           => 'nullable|string',
            'demographics'    => 'nullable|string',
            'kitchen'         => 'nullable|string',
            // Stats
            'followers'       => 'nullable|string',
            'following'       => 'nullable|string',
            'total_ratings'   => 'nullable|string',
            // Order / booking
            'booking'               => 'nullable|string',
            'booking_slot_value'    => 'nullable|string',
            'platforms'             => 'nullable|string',
            'order_online_link'     => 'nullable|string',
            'delivery_fee_discount' => 'nullable|string',
            'offline_record_time'   => 'nullable|string',
            // Other
            'related'              => 'nullable|string',
            'associated_listings'  => 'nullable|string',
            // Hours
            'monday_open'    => 'nullable|string|max:10', 'monday_close'    => 'nullable|string|max:10',
            'tuesday_open'   => 'nullable|string|max:10', 'tuesday_close'   => 'nullable|string|max:10',
            'wednesday_open' => 'nullable|string|max:10', 'wednesday_close' => 'nullable|string|max:10',
            'thursday_open'  => 'nullable|string|max:10', 'thursday_close'  => 'nullable|string|max:10',
            'friday_open'    => 'nullable|string|max:10', 'friday_close'    => 'nullable|string|max:10',
            'saturday_open'  => 'nullable|string|max:10', 'saturday_close'  => 'nullable|string|max:10',
            'sunday_open'    => 'nullable|string|max:10', 'sunday_close'    => 'nullable|string|max:10',
            // Dates
            'checkin_start' => 'nullable|date',
            'checkin_end'   => 'nullable|date',
            'start_date'    => 'nullable|date',
            'end_date'      => 'nullable|date',
            'closedDate'    => 'nullable|date',
        ];
    }

    private function resolveSlug(?string $provided, string $name, ?int $ignoreId = null): string
    {
        $base = $provided ? Str::slug($provided) : Str::slug($name);
        if (!$base) $base = 'business';
        $slug = $base;
        $i = 1;
        while (Muzzhub::where('slug', $slug)->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }
}
