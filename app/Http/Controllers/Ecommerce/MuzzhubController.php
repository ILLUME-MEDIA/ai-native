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
        $request->validate([
            'lat'    => 'nullable|numeric|between:-90,90',
            'lng'    => 'nullable|numeric|between:-180,180',
            'radius' => 'nullable|numeric|min:0.1|max:5000',
        ]);

        $lat    = $request->filled('lat')    ? (float) $request->lat    : null;
        $lng    = $request->filled('lng')    ? (float) $request->lng    : null;
        $radius = $request->filled('radius') ? (float) $request->radius : 100;

        $useLocation = $lat !== null && $lng !== null;

        $q = Muzzhub::with(['category:id,name,slug,color,icon', 'business:id,name,slug', 'cuisines:id,name,slug,icon,hover_icon']);

        if ($useLocation) {
            // Haversine formula — distance in miles
            $haversineExpr = "( 3959 * acos( LEAST(1, cos(radians({$lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians({$lng})) + sin(radians({$lat})) * sin(radians(latitude)) ) ) )";

            $q->selectRaw("*, {$haversineExpr} AS distance_miles")
              ->whereNotNull('latitude')
              ->whereNotNull('longitude')
              ->whereRaw("{$haversineExpr} <= ?", [$radius])
              ->orderByRaw("{$haversineExpr} ASC");
        } else {
            $q->orderBy('name');
        }

        if ($request->filled('search')) {
            $term = '%' . $request->search . '%';
            $q->where(function ($sub) use ($term) {
                $sub->where('name',        'like', $term)
                    ->orWhere('description','like', $term)
                    ->orWhere('address',    'like', $term)
                    ->orWhere('address_2',  'like', $term)
                    ->orWhere('city',       'like', $term)
                    ->orWhere('state',      'like', $term)
                    ->orWhere('zip',        'like', $term)
                    ->orWhere('country',    'like', $term)
                    ->orWhere('type',       'like', $term)
                    ->orWhere('cuisine',    'like', $term)
                    ->orWhere('phone',      'like', $term)
                    ->orWhere('email',      'like', $term);
            });
        }
        if ($request->boolean('active_only'))  $q->where('is_active', true);
        if ($request->filled('type'))          $q->where('type', $request->type);
        if ($request->filled('city'))          $q->where('city', 'like', '%' . $request->city . '%');
        if ($request->filled('country'))       $q->where('country', $request->country);
        if ($request->boolean('delivery'))     $q->where('delivery', true);
        if ($request->boolean('featured'))     $q->where('featured', true);
        if ($request->filled('category_id'))   $q->where('category_id', $request->category_id);

        // cuisine filter — supports cuisine_id (single or CSV/array) or legacy cuisine name string
        if ($request->filled('cuisine_id')) {
            $ids = is_array($request->cuisine_id)
                ? $request->cuisine_id
                : array_map('trim', explode(',', $request->cuisine_id));
            $ids = array_filter($ids);
            if (!empty($ids)) {
                $q->whereHas('cuisines', fn($sub) => $sub->whereIn('cuisines.id', $ids));
            }
        } elseif ($request->filled('cuisine')) {
            // Legacy text filter (backwards-compatible)
            $cuisines = is_array($request->cuisine)
                ? $request->cuisine
                : array_map('trim', explode(',', $request->cuisine));
            $cuisines = array_filter($cuisines);
            if (!empty($cuisines)) {
                $q->whereHas('cuisines', function ($sub) use ($cuisines) {
                    $sub->where(function ($inner) use ($cuisines) {
                        foreach ($cuisines as $c) {
                            $inner->orWhere('cuisines.name', 'like', '%' . $c . '%');
                        }
                    });
                });
            }
        }

        $paginated = $q->paginate($request->input('per_page', 15));

        if ($useLocation) {
            $paginated->getCollection()->transform(function ($item) {
                $item->distance_miles = $item->distance_miles !== null ? round((float) $item->distance_miles, 2) : null;
                return $item;
            });
        }

        return response()->json($paginated);
    }

    public function show(Muzzhub $muzzhub): JsonResponse
    {
        return response()->json($muzzhub->load(['category:id,name,slug,color,icon', 'business', 'cuisines:id,name,slug,icon']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $data['slug'] = $this->resolveSlug($request->input('slug'), $data['name']);
        $record = Muzzhub::create($data);
        if ($request->has('cuisine_ids')) {
            $record->cuisines()->sync(array_filter((array) $request->cuisine_ids));
        }
        $this->syncAutoAcceptToBusiness($record);
        return response()->json($record->load('cuisines:id,name,slug,icon'), 201);
    }

    public function update(Request $request, Muzzhub $muzzhub): JsonResponse
    {
        $data = $request->validate($this->rules('update', $muzzhub->id));
        if ($request->filled('slug')) {
            $data['slug'] = $this->resolveSlug($request->input('slug'), $data['name'] ?? $muzzhub->name, $muzzhub->id);
        }
        $muzzhub->update($data);
        if ($request->has('cuisine_ids')) {
            $muzzhub->cuisines()->sync(array_filter((array) $request->cuisine_ids));
        }
        $this->syncAutoAcceptToBusiness($muzzhub->fresh());
        return response()->json($muzzhub->load('cuisines:id,name,slug,icon'));
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
