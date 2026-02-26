<?php

namespace App\Http\Controllers\Ecommerce;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\StripeCustomer;
use App\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;

class StripeController extends Controller
{
    public function __construct(private StripeService $stripe) {}

    // ── Auth helpers ──────────────────────────────────────────────────────────

    /**
     * Extract OTP payload from Bearer token.
     * Returns ['type','table','id','exp'] or null.
     */
    private function otpPayload(Request $request): ?array
    {
        $auth = $request->header('Authorization', '');
        if (! str_starts_with($auth, 'Bearer ')) {
            return null;
        }
        $token = substr($auth, 7);
        try {
            $payload = decrypt($token);
            if (
                isset($payload['type'], $payload['id'], $payload['exp']) &&
                $payload['type'] === 'otp_auth' &&
                ! Carbon::createFromTimestamp($payload['exp'])->isPast()
            ) {
                return $payload;
            }
        } catch (\Throwable) {
        }
        return null;
    }

    private function requireOtpAuth(Request $request): array|JsonResponse
    {
        $payload = $this->otpPayload($request);
        if (! $payload) {
            return response()->json(['success' => false, 'message' => 'Authentication required. Send OTP Bearer token.'], 401);
        }
        return $payload;
    }

    /**
     * Get user email from the relevant table based on OTP payload.
     */
    private function getUserEmail(array $payload): ?string
    {
        $table = $payload['table'] ?? 'users';
        $id    = (int) $payload['id'];
        $row   = \Illuminate\Support\Facades\DB::table($table)->where('id', $id)->first();
        return $row?->email ?? null;
    }

    private function getUserName(array $payload): ?string
    {
        $table = $payload['table'] ?? 'users';
        $id    = (int) $payload['id'];
        $row   = \Illuminate\Support\Facades\DB::table($table)->where('id', $id)->first();
        return $row?->name ?? null;
    }

    // ── Public config (publishable key for frontend) ──────────────────────────

    /**
     * GET /api/payment/stripe/config
     *
     * Returns the Stripe publishable key so the frontend can initialise Stripe.js
     * without needing a build-time VITE_ env variable.
     */
    public function config(): JsonResponse
    {
        return response()->json([
            'publishable_key' => config('services.stripe.publishable') ?? '',
        ]);
    }

    // ── Setup Intent (Step 1 — save card without charging) ───────────────────

    /**
     * POST /api/payment/stripe/setup-intent
     *
     * Creates a Stripe SetupIntent so the frontend can securely collect card details.
     * Use the returned `client_secret` with stripe.confirmCardSetup() on the frontend.
     */
    public function setupIntent(Request $request): JsonResponse
    {
        $payload = $this->requireOtpAuth($request);
        if ($payload instanceof JsonResponse) return $payload;

        $email = $this->getUserEmail($payload);
        $name  = $this->getUserName($payload);
        $table = $payload['table'] ?? 'users';
        $id    = (int) $payload['id'];

        $customer = $this->stripe->findOrCreateCustomer($table, $id, $email ?? '', $name);
        $data     = $this->stripe->createSetupIntent($customer);

        return response()->json([
            'success'            => true,
            'client_secret'      => $data['client_secret'],
            'stripe_customer_id' => $data['stripe_customer_id'],
        ]);
    }

    // ── Save Payment Method (Step 2 — after confirmCardSetup) ─────────────────

    /**
     * POST /api/payment/stripe/save-method
     *
     * After the frontend calls stripe.confirmCardSetup() and gets a payment_method id,
     * call this endpoint to attach it to the customer and save it in our DB.
     */
    public function saveMethod(Request $request): JsonResponse
    {
        $payload = $this->requireOtpAuth($request);
        if ($payload instanceof JsonResponse) return $payload;

        $data = $request->validate([
            'payment_method_id' => 'required|string|starts_with:pm_',
            'set_default'       => 'boolean',
        ]);

        $table = $payload['table'] ?? 'users';
        $id    = (int) $payload['id'];
        $email = $this->getUserEmail($payload);
        $name  = $this->getUserName($payload);

        $customer = $this->stripe->findOrCreateCustomer($table, $id, $email ?? '', $name);
        $pm       = $this->stripe->savePaymentMethod($customer, $data['payment_method_id'], $data['set_default'] ?? false);

        return response()->json([
            'success'        => true,
            'payment_method' => $this->formatPm($pm),
        ], 201);
    }

    // ── List Saved Methods ────────────────────────────────────────────────────

    /**
     * GET /api/payment/stripe/methods
     *
     * Returns all saved payment methods for the authenticated user.
     */
    public function listMethods(Request $request): JsonResponse
    {
        $payload = $this->requireOtpAuth($request);
        if ($payload instanceof JsonResponse) return $payload;

        $table = $payload['table'] ?? 'users';
        $id    = (int) $payload['id'];

        $customer = StripeCustomer::where('user_table', $table)->where('user_id', $id)->first();

        if (! $customer) {
            return response()->json(['success' => true, 'payment_methods' => []]);
        }

        $methods = $this->stripe->listPaymentMethods($customer);

        return response()->json([
            'success'         => true,
            'payment_methods' => $methods->map(fn ($pm) => $this->formatPm($pm)),
        ]);
    }

    // ── Delete Payment Method ─────────────────────────────────────────────────

    /**
     * DELETE /api/payment/stripe/methods/{id}
     *
     * Detaches a payment method from Stripe and removes it from our DB.
     * {id} is the local DB id (from list response).
     */
    public function deleteMethod(Request $request, int $id): JsonResponse
    {
        $payload = $this->requireOtpAuth($request);
        if ($payload instanceof JsonResponse) return $payload;

        $table    = $payload['table'] ?? 'users';
        $userId   = (int) $payload['id'];
        $customer = StripeCustomer::where('user_table', $table)->where('user_id', $userId)->first();

        if (! $customer) {
            return response()->json(['success' => false, 'message' => 'No Stripe customer found.'], 404);
        }

        $this->stripe->deletePaymentMethod($customer, $id);

        return response()->json(['success' => true, 'message' => 'Payment method removed.']);
    }

    // ── Set Default Payment Method ────────────────────────────────────────────

    /**
     * POST /api/payment/stripe/methods/{id}/set-default
     *
     * Marks a payment method as the default for future charges.
     */
    public function setDefault(Request $request, int $id): JsonResponse
    {
        $payload = $this->requireOtpAuth($request);
        if ($payload instanceof JsonResponse) return $payload;

        $table    = $payload['table'] ?? 'users';
        $userId   = (int) $payload['id'];
        $customer = StripeCustomer::where('user_table', $table)->where('user_id', $userId)->first();

        if (! $customer) {
            return response()->json(['success' => false, 'message' => 'No Stripe customer found.'], 404);
        }

        $pm = $this->stripe->setDefaultPaymentMethod($customer, $id);

        return response()->json([
            'success'        => true,
            'payment_method' => $this->formatPm($pm),
        ]);
    }

    // ── Charge Order ──────────────────────────────────────────────────────────

    /**
     * POST /api/payment/stripe/charge
     *
     * Charges a saved card for a specific order.
     * Uses the default payment method unless `payment_method_id` is provided.
     */
    public function charge(Request $request): JsonResponse
    {
        $payload = $this->requireOtpAuth($request);
        if ($payload instanceof JsonResponse) return $payload;

        $data = $request->validate([
            'order_id'          => 'required|integer|exists:orders,id',
            'payment_method_id' => 'nullable|string|starts_with:pm_',
        ]);

        $table    = $payload['table'] ?? 'users';
        $userId   = (int) $payload['id'];
        $customer = StripeCustomer::where('user_table', $table)->where('user_id', $userId)->first();

        if (! $customer) {
            return response()->json(['success' => false, 'message' => 'No saved payment method. Please save a card first.'], 422);
        }

        $order = Order::findOrFail($data['order_id']);

        if ($order->payment_status === 'paid') {
            return response()->json(['success' => false, 'message' => 'Order is already paid.'], 409);
        }

        $amountCents = (int) round($order->total * 100);

        $intent = $this->stripe->charge(
            $customer,
            $amountCents,
            'usd',
            $data['payment_method_id'] ?? null,
            "Order #{$order->order_number}"
        );

        $order->update([
            'payment_status'           => $intent->status === 'succeeded' ? 'paid' : 'failed',
            'payment_method'           => 'stripe_card',
            'stripe_payment_intent_id' => $intent->id,
            'paid_at'                  => $intent->status === 'succeeded' ? now() : null,
        ]);

        return response()->json([
            'success'           => true,
            'payment_status'    => $order->payment_status,
            'payment_intent_id' => $intent->id,
            'amount_charged'    => $order->total,
            'order_number'      => $order->order_number,
        ]);
    }

    // ── Webhook ───────────────────────────────────────────────────────────────

    /**
     * POST /api/payment/stripe/webhook
     *
     * Stripe sends events here (payment_intent.succeeded, payment_intent.payment_failed, etc.).
     * Configure this URL in your Stripe Dashboard → Webhooks.
     */
    public function webhook(Request $request): Response
    {
        $payload   = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature', '');

        try {
            $event = $this->stripe->constructWebhookEvent($payload, $sigHeader);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            return response('Invalid signature', 400);
        } catch (\Throwable $e) {
            return response('Webhook error: ' . $e->getMessage(), 400);
        }

        match ($event->type) {
            'payment_intent.succeeded' => $this->handlePaymentSucceeded($event->data->object),
            'payment_intent.payment_failed' => $this->handlePaymentFailed($event->data->object),
            default => null,
        };

        return response('ok', 200);
    }

    private function handlePaymentSucceeded(\Stripe\PaymentIntent $intent): void
    {
        Order::where('stripe_payment_intent_id', $intent->id)->update([
            'payment_status' => 'paid',
            'paid_at'        => now(),
        ]);
    }

    private function handlePaymentFailed(\Stripe\PaymentIntent $intent): void
    {
        Order::where('stripe_payment_intent_id', $intent->id)->update([
            'payment_status' => 'failed',
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function formatPm(\App\Models\StripePaymentMethod $pm): array
    {
        return [
            'id'              => $pm->id,
            'stripe_pm_id'    => $pm->stripe_pm_id,
            'brand'           => $pm->brand,
            'last4'           => $pm->last4,
            'exp_month'       => $pm->exp_month,
            'exp_year'        => $pm->exp_year,
            'cardholder_name' => $pm->cardholder_name,
            'is_default'      => $pm->is_default,
        ];
    }
}
