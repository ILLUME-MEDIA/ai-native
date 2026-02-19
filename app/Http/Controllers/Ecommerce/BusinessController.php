<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Business;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BusinessController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Business::with('category')->orderBy('name');
        if ($request->filled('category_id'))    $q->where('category_id', $request->category_id);
        if ($request->filled('search'))         $q->where('name', 'like', '%' . $request->search . '%');
        if ($request->filled('type'))           $q->whereHas('category', fn($c) => $c->where('type', $request->type));
        if ($request->boolean('active_only'))   $q->where('is_active', true);
        return response()->json($q->paginate($request->input('per_page', 15)));
    }

    public function show(Business $business): JsonResponse
    {
        return response()->json($business->load(['category', 'menuCategories.menuItems']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $data['slug'] = $this->resolveSlug($request->input('slug'), $data['name']);
        $business = Business::create($data);
        return response()->json($business->load('category'), 201);
    }

    public function update(Request $request, Business $business): JsonResponse
    {
        $data = $request->validate($this->rules('update', $business->id));
        if ($request->filled('slug')) {
            $data['slug'] = $this->resolveSlug($request->input('slug'), $data['name'] ?? $business->name, $business->id);
        }
        $business->update($data);
        return response()->json($business->load('category'));
    }

    public function destroy(Business $business): JsonResponse
    {
        $business->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    private function rules(string $mode = 'create', ?int $ignoreId = null): array
    {
        $slugUnique = 'unique:businesses,slug' . ($ignoreId ? ",{$ignoreId}" : '');
        $req = $mode === 'create' ? 'required' : 'sometimes';
        return [
            'category_id'      => "{$req}|exists:business_categories,id",
            'name'             => "{$req}|string|max:200",
            'slug'             => "nullable|string|max:200|{$slugUnique}",
            'description'      => 'nullable|string',
            'cuisine'          => 'nullable|string|max:500',
            'address'          => 'nullable|string|max:500',
            'address_2'        => 'nullable|string|max:500',
            'city'             => 'nullable|string|max:100',
            'state'            => 'nullable|string|max:100',
            'zip'              => 'nullable|string|max:20',
            'country'          => 'nullable|string|max:10',
            'phone'            => 'nullable|string|max:30',
            'email'            => 'nullable|email|max:200',
            'website'          => 'nullable|string|max:500',
            'logo'             => 'nullable|string',
            'cover_image'      => 'nullable|string',
            'latitude'         => 'nullable|numeric',
            'longitude'        => 'nullable|numeric',
            'compliance'       => 'nullable|string|max:200',
            'slaughter_method' => 'nullable|string|max:200',
            'halal_authority'  => 'nullable|string|max:200',
            'halal_info'       => 'nullable|string',
            'halal_options'    => 'nullable|string|max:200',
            'halal_chain'      => 'nullable|string|max:200',
            'price'            => 'nullable|string|max:10',
            'parking'          => 'nullable|string|max:200',
            'credit_cards'     => 'nullable|string|max:500',
            'transit'          => 'nullable|string|max:500',
            'permalink'        => 'nullable|string|max:500',
            'rating'           => 'nullable|numeric|min:0|max:5',
            'review_count'     => 'nullable|integer|min:0',
            'alcohol'          => 'boolean',
            'kids_menu'        => 'boolean',
            'pray_space'       => 'boolean',
            'organic'          => 'boolean',
            'catering'         => 'boolean',
            'delivery'         => 'boolean',
            'wheelchair_access'=> 'boolean',
            'wifi'             => 'boolean',
            'cash_only'        => 'boolean',
            'pork'             => 'boolean',
            'drive_thru'       => 'boolean',
            'reservations'     => 'boolean',
            'outdoor_seating'  => 'boolean',
            'shisha'           => 'boolean',
            'featured'         => 'boolean',
            'sponsored'        => 'boolean',
            'is_active'        => 'boolean',
            'monday_open'      => 'nullable|string|max:10',
            'monday_close'     => 'nullable|string|max:10',
            'tuesday_open'     => 'nullable|string|max:10',
            'tuesday_close'    => 'nullable|string|max:10',
            'wednesday_open'   => 'nullable|string|max:10',
            'wednesday_close'  => 'nullable|string|max:10',
            'thursday_open'    => 'nullable|string|max:10',
            'thursday_close'   => 'nullable|string|max:10',
            'friday_open'      => 'nullable|string|max:10',
            'friday_close'     => 'nullable|string|max:10',
            'saturday_open'    => 'nullable|string|max:10',
            'saturday_close'   => 'nullable|string|max:10',
            'sunday_open'      => 'nullable|string|max:10',
            'sunday_close'     => 'nullable|string|max:10',
        ];
    }

    private function resolveSlug(?string $provided, string $name, ?int $ignoreId = null): string
    {
        $base = $provided ? Str::slug($provided) : Str::slug($name);
        if (!$base) $base = 'business';
        $slug = $base;
        $i = 1;
        while (Business::where('slug', $slug)->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }
}
