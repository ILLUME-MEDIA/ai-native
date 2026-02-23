<?php

namespace App\Services;

use App\Models\StripeCustomer;
use App\Models\StripePaymentMethod;
use Stripe\StripeClient;
use Stripe\Exception\ApiErrorException;

class StripeService
{
    private StripeClient $stripe;

    public function __construct()
    {
        $this->stripe = new StripeClient(config('services.stripe.secret'));
    }

    // ── Customer ──────────────────────────────────────────────────────────────

    /**
     * Find or create a StripeCustomer record + Stripe Customer object.
     * Returns the local StripeCustomer model.
     */
    public function findOrCreateCustomer(string $userTable, int $userId, string $email, ?string $name = null): StripeCustomer
    {
        $local = StripeCustomer::where('user_table', $userTable)
            ->where('user_id', $userId)
            ->first();

        if ($local) {
            return $local;
        }

        $customer = $this->stripe->customers->create([
            'email'    => $email,
            'name'     => $name,
            'metadata' => ['user_table' => $userTable, 'user_id' => (string) $userId],
        ]);

        return StripeCustomer::create([
            'user_table'         => $userTable,
            'user_id'            => $userId,
            'stripe_customer_id' => $customer->id,
            'email'              => $email,
        ]);
    }

    // ── SetupIntent ───────────────────────────────────────────────────────────

    /**
     * Create a SetupIntent for saving a card (no charge).
     * Returns ['client_secret', 'stripe_customer_id'].
     */
    public function createSetupIntent(StripeCustomer $customer): array
    {
        $intent = $this->stripe->setupIntents->create([
            'customer'             => $customer->stripe_customer_id,
            'payment_method_types' => ['card'],
            'usage'                => 'off_session',
        ]);

        return [
            'client_secret'      => $intent->client_secret,
            'stripe_customer_id' => $customer->stripe_customer_id,
        ];
    }

    // ── Payment Methods ───────────────────────────────────────────────────────

    /**
     * Attach a PaymentMethod to a customer and save to DB.
     * If $setDefault=true, marks it as default (unsets others).
     */
    public function savePaymentMethod(StripeCustomer $customer, string $pmId, bool $setDefault = false): StripePaymentMethod
    {
        // Attach to Stripe customer
        $this->stripe->paymentMethods->attach($pmId, ['customer' => $customer->stripe_customer_id]);

        $pm = $this->stripe->paymentMethods->retrieve($pmId);

        if ($setDefault) {
            $this->stripe->customers->update($customer->stripe_customer_id, [
                'invoice_settings' => ['default_payment_method' => $pmId],
            ]);
            // Unset previous defaults in DB
            $customer->paymentMethods()->where('is_default', true)->update(['is_default' => false]);
        }

        return StripePaymentMethod::updateOrCreate(
            ['stripe_pm_id' => $pmId],
            [
                'stripe_customer_id' => $customer->id,
                'brand'              => $pm->card->brand ?? null,
                'last4'              => $pm->card->last4 ?? null,
                'exp_month'          => $pm->card->exp_month ?? null,
                'exp_year'           => $pm->card->exp_year ?? null,
                'cardholder_name'    => $pm->billing_details->name ?? null,
                'is_default'         => $setDefault,
            ]
        );
    }

    /**
     * List all saved payment methods for a customer from local DB.
     */
    public function listPaymentMethods(StripeCustomer $customer): \Illuminate\Database\Eloquent\Collection
    {
        return $customer->paymentMethods()->orderByDesc('is_default')->orderByDesc('id')->get();
    }

    /**
     * Delete (detach) a payment method. Verifies ownership.
     */
    public function deletePaymentMethod(StripeCustomer $customer, int $localId): void
    {
        $pm = StripePaymentMethod::where('id', $localId)
            ->where('stripe_customer_id', $customer->id)
            ->firstOrFail();

        $this->stripe->paymentMethods->detach($pm->stripe_pm_id);
        $pm->delete();
    }

    /**
     * Set a payment method as default.
     */
    public function setDefaultPaymentMethod(StripeCustomer $customer, int $localId): StripePaymentMethod
    {
        $pm = StripePaymentMethod::where('id', $localId)
            ->where('stripe_customer_id', $customer->id)
            ->firstOrFail();

        $this->stripe->customers->update($customer->stripe_customer_id, [
            'invoice_settings' => ['default_payment_method' => $pm->stripe_pm_id],
        ]);

        $customer->paymentMethods()->where('is_default', true)->update(['is_default' => false]);
        $pm->update(['is_default' => true]);

        return $pm->fresh();
    }

    // ── Charge ────────────────────────────────────────────────────────────────

    /**
     * Charge a customer using a saved payment method.
     * $amountCents: amount in smallest currency unit (e.g. cents for USD).
     * Returns Stripe PaymentIntent.
     */
    public function charge(
        StripeCustomer $customer,
        int $amountCents,
        string $currency = 'usd',
        ?string $pmId = null,
        ?string $description = null
    ): \Stripe\PaymentIntent {
        // If no PM specified, use default
        if (!$pmId) {
            $default = $customer->defaultMethod();
            if (!$default) {
                throw new \RuntimeException('No default payment method found. Please save a card first.');
            }
            $pmId = $default->stripe_pm_id;
        }

        return $this->stripe->paymentIntents->create([
            'amount'               => $amountCents,
            'currency'             => $currency,
            'customer'             => $customer->stripe_customer_id,
            'payment_method'       => $pmId,
            'description'          => $description,
            'confirm'              => true,
            'off_session'          => true,
            'return_url'           => config('app.url'),
        ]);
    }

    // ── Webhook ───────────────────────────────────────────────────────────────

    /**
     * Construct and verify a Stripe webhook event.
     */
    public function constructWebhookEvent(string $payload, string $sigHeader): \Stripe\Event
    {
        return \Stripe\Webhook::constructEvent(
            $payload,
            $sigHeader,
            config('services.stripe.webhook_secret')
        );
    }
}
