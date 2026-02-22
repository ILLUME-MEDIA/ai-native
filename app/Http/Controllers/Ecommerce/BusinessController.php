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
        $q = Business::orderBy('name');

        if ($request->filled('search'))       $q->where('name', 'like', '%' . $request->search . '%');
        if ($request->boolean('active_only')) $q->where('is_active', true);
        if ($request->filled('city'))         $q->where('city', 'like', '%' . $request->city . '%');
        if ($request->filled('country'))      $q->where('country', $request->country);
        if ($request->boolean('delivery'))    $q->where('delivery', true);
        if ($request->boolean('featured'))    $q->where('featured', true);

        return response()->json($q->paginate($request->input('per_page', 15)));
    }

    public function show(Business $business): JsonResponse
    {
        return response()->json($business->load(['menuCategories.menuItems']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $data['slug'] = $this->resolveSlug($request->input('slug'), $data['name']);
        $business = Business::create($data);
        return response()->json($business, 201);
    }

    public function update(Request $request, Business $business): JsonResponse
    {
        $data = $request->validate($this->rules('update', $business->id));
        if ($request->filled('slug')) {
            $data['slug'] = $this->resolveSlug($request->input('slug'), $data['name'] ?? $business->name, $business->id);
        }
        $business->update($data);
        return response()->json($business);
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
            'price'            => 'nullable|string|max:10',
            'delivery'         => 'boolean',
            'featured'         => 'boolean',
            'is_active'        => 'boolean',
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
