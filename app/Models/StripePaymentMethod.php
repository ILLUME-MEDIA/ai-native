<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StripePaymentMethod extends Model
{
    protected $fillable = [
        'stripe_customer_id',
        'stripe_pm_id',
        'brand',
        'last4',
        'exp_month',
        'exp_year',
        'cardholder_name',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'exp_month'  => 'integer',
        'exp_year'   => 'integer',
    ];

    public function stripeCustomer(): BelongsTo
    {
        return $this->belongsTo(StripeCustomer::class, 'stripe_customer_id');
    }
}
