<?php

namespace App\Models\DesignSystem;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DsComponent extends Model
{
    protected $table = 'ds_components';

    protected $fillable = ['name', 'slug', 'type', 'description', 'base_props'];

    protected $casts = ['base_props' => 'array'];

    public function variants(): HasMany
    {
        return $this->hasMany(DsComponentVariant::class, 'component_id');
    }
}
