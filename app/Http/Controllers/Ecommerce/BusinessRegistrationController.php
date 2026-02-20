<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\BusinessCategory;
use App\Models\BusinessRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BusinessRegistrationController extends Controller
{
    // ── Public: anyone can submit ─────────────────────────────────────────

    /**
     * POST /api/public/register-business
     * No auth required. Stores a new registration as "pending".
     */
    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_name'      => 'required|string|max:255',
            'address'            => 'nullable|string|max:255',
            'address_2'          => 'nullable|string|max:255',
            'city'               => 'nullable|string|max:100',
            'state'              => 'nullable|string|max:100',
            'zip'                => 'nullable|string|max:20',
            'country'            => 'nullable|string|max:100',

            'contact_name'       => 'required|string|max:255',
            'contact_email'      => 'required|email|max:255',
            'contact_phone'      => 'nullable|string|max:50',
            'website_url'        => 'nullable|url|max:500',
            'menu_url'           => 'nullable|url|max:500',
            'external_site_url'  => 'nullable|url|max:500',

            // Hours: pass as flat fields or hours object; we accept both
            'monday_open'        => 'nullable|string|max:10',
            'monday_close'       => 'nullable|string|max:10',
            'tuesday_open'       => 'nullable|string|max:10',
            'tuesday_close'      => 'nullable|string|max:10',
            'wednesday_open'     => 'nullable|string|max:10',
            'wednesday_close'    => 'nullable|string|max:10',
            'thursday_open'      => 'nullable|string|max:10',
            'thursday_close'     => 'nullable|string|max:10',
            'friday_open'        => 'nullable|string|max:10',
            'friday_close'       => 'nullable|string|max:10',
            'saturday_open'      => 'nullable|string|max:10',
            'saturday_close'     => 'nullable|string|max:10',
            'sunday_open'        => 'nullable|string|max:10',
            'sunday_close'       => 'nullable|string|max:10',

            'bio'                => 'nullable|string|max:5000',
            'image_url'          => 'nullable|string|max:1000',
            'audio_url'          => 'nullable|string|max:1000',

            'agreement_accepted' => 'required|accepted',
            'signature_name'     => 'required|string|max:255',
            'signature_data'     => 'nullable|string',  // base64

            'target_source'      => 'nullable|in:businesses,muzzhub,pakistanhub',
        ]);

        $data['ip_address']    = $request->ip();
        $data['status']        = 'pending';
        $data['target_source'] = $data['target_source'] ?? 'businesses';

        $reg = BusinessRegistration::create($data);

        return response()->json([
            'message' => 'Registration submitted successfully. We will review and contact you soon.',
            'id'      => $reg->id,
        ], 201);
    }

    // ── Admin: auth:sanctum protected ────────────────────────────────────

    /**
     * GET /api/ecommerce/registrations
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $query = BusinessRegistration::query()
            ->orderByRaw("FIELD(status, 'pending', 'approved', 'rejected')")
            ->orderBy('created_at', 'desc');

        if ($status && in_array($status, ['pending', 'approved', 'rejected'])) {
            $query->where('status', $status);
        }

        $registrations = $query->paginate($request->query('per_page', 20));

        return response()->json($registrations);
    }

    /**
     * GET /api/ecommerce/registrations/{registration}
     */
    public function show(BusinessRegistration $registration): JsonResponse
    {
        return response()->json($registration->load('business'));
    }

    /**
     * POST /api/ecommerce/registrations/{registration}/approve
     * Creates a Business record from the registration and marks it approved.
     */
    public function approve(Request $request, BusinessRegistration $registration): JsonResponse
    {
        if ($registration->status === 'approved') {
            return response()->json(['message' => 'Already approved.'], 409);
        }

        $data = $request->validate([
            'category_id'       => 'nullable|integer|exists:business_categories,id',
            'external_site_url' => 'nullable|url|max:500',
        ]);

        // Determine category — fallback to first available
        $categoryId = $data['category_id']
            ?? BusinessCategory::first()?->id;

        // Determine source tag from target_source on registration
        $targetSource = $registration->target_source ?? 'businesses';
        $source       = $targetSource !== 'businesses' ? $targetSource : null;

        // Determine country default based on target_source
        $countryDefault = match ($targetSource) {
            'pakistanhub' => 'PK',
            'muzzhub'     => 'US',
            default       => $registration->country ?? 'US',
        };

        // Create the Business record
        $business = Business::create([
            'category_id'     => $categoryId,
            'name'            => $registration->business_name,
            'slug'            => $this->uniqueSlug($registration->business_name),
            'description'     => $registration->bio,
            'address'         => $registration->address,
            'address_2'       => $registration->address_2,
            'city'            => $registration->city,
            'state'           => $registration->state,
            'zip'             => $registration->zip,
            'country'         => $registration->country ?? $countryDefault,
            'phone'           => $registration->contact_phone,
            'email'           => $registration->contact_email,
            'website'         => $registration->website_url,
            'logo'            => $registration->image_url,
            'monday_open'     => $registration->monday_open,
            'monday_close'    => $registration->monday_close,
            'tuesday_open'    => $registration->tuesday_open,
            'tuesday_close'   => $registration->tuesday_close,
            'wednesday_open'  => $registration->wednesday_open,
            'wednesday_close' => $registration->wednesday_close,
            'thursday_open'   => $registration->thursday_open,
            'thursday_close'  => $registration->thursday_close,
            'friday_open'     => $registration->friday_open,
            'friday_close'    => $registration->friday_close,
            'saturday_open'   => $registration->saturday_open,
            'saturday_close'  => $registration->saturday_close,
            'sunday_open'     => $registration->sunday_open,
            'sunday_close'    => $registration->sunday_close,
            'source'          => $source,
            'is_active'       => true,
        ]);

        // Update registration
        $registration->update([
            'status'            => 'approved',
            'business_id'       => $business->id,
            'external_site_url' => $data['external_site_url'] ?? $registration->external_site_url,
            'rejection_reason'  => null,
        ]);

        return response()->json([
            'message'           => 'Registration approved. Business created.',
            'business_id'       => $business->id,
            'external_site_url' => $registration->fresh()->external_site_url,
        ]);
    }

    /**
     * POST /api/ecommerce/registrations/{registration}/reject
     */
    public function reject(Request $request, BusinessRegistration $registration): JsonResponse
    {
        if ($registration->status === 'rejected') {
            return response()->json(['message' => 'Already rejected.'], 409);
        }

        $data = $request->validate([
            'reason' => 'nullable|string|max:1000',
        ]);

        $registration->update([
            'status'           => 'rejected',
            'rejection_reason' => $data['reason'] ?? null,
        ]);

        return response()->json(['message' => 'Registration rejected.']);
    }

    /**
     * DELETE /api/ecommerce/registrations/{registration}
     */
    public function destroy(BusinessRegistration $registration): JsonResponse
    {
        $registration->delete();
        return response()->json(['message' => 'Deleted.']);
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i    = 1;
        while (Business::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }
}
