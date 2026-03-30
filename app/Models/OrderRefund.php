<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderRefund extends Model
{
    protected $fillable = [
        'order_id',
        'user_table',
        'user_id',
        'amount',
        'issue_type',
        'reason',
        'refund_type',
        'refund_item_ids',
        'status',
        'stripe_refund_id',
        'auto_refunded',
        'admin_note',
        'processed_at',
    ];

    protected $casts = [
        'amount'          => 'float',
        'auto_refunded'   => 'boolean',
        'processed_at'    => 'datetime',
        'refund_item_ids' => 'array',
    ];

    public static function refundTypes(): array
    {
        return [
            'full'         => 'Full Refund',
            'platform_fee' => 'Platform Fee Only',
            'tip'          => 'Tip Only',
            'subtotal'     => 'Subtotal (no fees)',
            'partial'      => 'Partial Amount',
            'items'        => 'Specific Items',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** Human-readable issue type labels */
    public static function issueTypes(): array
    {
        return [
            'wrong_item'    => 'Wrong item received',
            'missing_item'  => 'Missing item',
            'damaged'       => 'Item arrived damaged',
            'late'          => 'Order arrived too late',
            'quality'       => 'Quality not as expected',
            'other'         => 'Other',
        ];
    }
}
