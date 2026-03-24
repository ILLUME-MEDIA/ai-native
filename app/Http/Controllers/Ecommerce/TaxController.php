<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Services\TaxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Tax lookup API.
 *
 * GET  /api/ecommerce/tax?zip=90001&subtotal=100
 * POST /api/ecommerce/tax  { "zip": "90001", "subtotal": 100 }
 *
 * No auth required — public endpoint for checkout pages and mobile apps.
 */
class TaxController extends Controller
{
    public function __construct(private readonly TaxService $taxService) {}

    /**
     * GET /api/ecommerce/tax?zip=90001&subtotal=100.00
     */
    public function show(Request $request): JsonResponse
    {
        $data = $request->validate([
            'zip'      => 'required|string|size:5|regex:/^\d{5}$/',
            'subtotal' => 'nullable|numeric|min:0',
        ]);

        return $this->respond($data['zip'], (float) ($data['subtotal'] ?? 0));
    }

    /**
     * POST /api/ecommerce/tax
     * Body: { "zip": "90001", "subtotal": 100.00 }
     */
    public function calculate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'zip'      => 'required|string|size:5|regex:/^\d{5}$/',
            'subtotal' => 'nullable|numeric|min:0',
        ]);

        return $this->respond($data['zip'], (float) ($data['subtotal'] ?? 0));
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private function respond(string $zip, float $subtotal): JsonResponse
    {
        $result = $this->taxService->calculate($subtotal, $zip);

        if (!$result['found']) {
            return response()->json([
                'success' => false,
                'message' => "No tax data found for ZIP code {$zip}. It may not exist or may be outside the US.",
                'data'    => $result,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => $result,
        ]);
    }
}
