<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalMeeting extends Model
{
    protected $fillable = [
        'cal_platform_id', 'openorg_user_id', 'user_source', 'booking_uid', 'event_type_id', 'title',
        'description', 'attendee_name', 'attendee_email', 'attendee_timezone',
        'start_time', 'end_time', 'status', 'meeting_url', 'metadata',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time'   => 'datetime',
        'metadata'   => 'array',
    ];

    public function platform(): BelongsTo
    {
        return $this->belongsTo(CalPlatform::class, 'cal_platform_id');
    }

    public function openorgUser(): BelongsTo
    {
        return $this->belongsTo(OpenorgUser::class, 'openorg_user_id');
    }
}
