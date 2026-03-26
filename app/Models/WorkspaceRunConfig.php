<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkspaceRunConfig extends Model
{
    protected $fillable = ['workspace_id', 'name', 'command', 'cwd', 'color'];

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }
}
