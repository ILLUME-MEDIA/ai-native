<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SnippetTemplate extends Model
{
    protected $fillable = ['workspace_id', 'user_id', 'name', 'trigger', 'language', 'body', 'description'];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
