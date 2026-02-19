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
        if ($request->boolean('active_only'))   $q->where('is_active', true);
        return response()->json($q->paginate(20));
    }

    public function show(Business $business): JsonResponse
    {
        return response()->json($business->load(['category', 'menuCategories.menuItems']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category_id'  => 'required|exists:business_categories,id',
            'name'         => 'required|string|max:200',
            'description'  => 'nullable|string',
            'address'      => 'nullable|string|max:500',
            'city'         => 'nullable|string|max:100',
            'state'        => 'nullable|string|max:100',
            'phone'        => 'nullable|string|max:30',
            'email'        => 'nullable|email|max:200',
            'logo'         => 'nullable|string',
            'cover_image'  => 'nullable|string',
            'latitude'     => 'nullable|numeric',
            'longitude'    => 'nullable|numeric',
            'is_active'    => 'boolean',
        ]);
        $data['slug'] = Str::slug($data['name']) . '-' . Str::random(6);
        $business = Business::create($data);
        return response()->json($business->load('category'), 201);
    }

    public function update(Request $request, Business $business): JsonResponse
    {
        $data = $request->validate([
            'category_id'  => 'sometimes|exists:business_categories,id',
            'name'         => 'sometimes|string|max:200',
            'description'  => 'nullable|string',
            'address'      => 'nullable|string|max:500',
            'city'         => 'nullable|string|max:100',
            'state'        => 'nullable|string|max:100',
            'phone'        => 'nullable|string|max:30',
            'email'        => 'nullable|email|max:200',
            'logo'         => 'nullable|string',
            'cover_image'  => 'nullable|string',
            'latitude'     => 'nullable|numeric',
            'longitude'    => 'nullable|numeric',
            'is_active'    => 'boolean',
        ]);
        $business->update($data);
        return response()->json($business->load('category'));
    }

    public function destroy(Business $business): JsonResponse
    {
        $business->delete();
        return response()->json(['message' => 'Deleted.']);
    }
}
