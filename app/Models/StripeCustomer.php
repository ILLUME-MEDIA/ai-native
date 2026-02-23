<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StripeCustomer extends Model
{
    protected $fillable = [
        'user_table',
        'user_id',
        'stripe_customer_id',
        'email',
    ];

    public function paymentMethods(): HasMany
    {
        return $this->hasMany(StripePaymentMethod::class, 'stripe_customer_id');
    }

    public function defaultMethod(): ?StripePaymentMethod
    {
        return $this->paymentMethods()->where('is_default', true)->first();
    }
}
