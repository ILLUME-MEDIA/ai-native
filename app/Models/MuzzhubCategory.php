<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MuzzhubCategory extends Model
{
    use SoftDeletes;

    protected $table = 'muzzhub_categories';

    protected $fillable = [
        'name', 'slug', 'description', 'icon', 'color', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function businesses(): HasMany
    {
        return $this->hasMany(Muzzhub::class, 'category_id');
    }
}
