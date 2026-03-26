<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FileSnapshot extends Model
{
    protected $fillable = ['workspace_id', 'file_path', 'content'];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }
}
