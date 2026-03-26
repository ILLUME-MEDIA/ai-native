<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkspacePresence extends Model
{
    public $timestamps = false;

    protected $table = 'workspace_presence';

    protected $fillable = ['workspace_id', 'user_id', 'open_file', 'cursor_line', 'cursor_col', 'last_seen_at'];

    protected $casts = [
        'last_seen_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
