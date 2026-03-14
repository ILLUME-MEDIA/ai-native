<?php

namespace App\Models\DesignSystem;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DsTheme extends Model
{
    protected $table = 'ds_themes';

    protected $fillable = ['name', 'slug', 'is_default', 'description'];

    protected $casts = ['is_default' => 'boolean'];

    public function tokens(): HasMany
    {
        return $this->hasMany(DsToken::class, 'theme_id');
    }

    public function tokenGroups(): HasMany
    {
        return $this->hasMany(DsTokenGroup::class, 'theme_id');
    }

    /** Resolve all tokens for this theme as a flat key→value map */
    public function resolveTokenMap(): array
    {
        $tokens = $this->tokens()->get();
        $map = [];

        // First pass: static values
        foreach ($tokens as $token) {
            if ($token->type === 'static') {
                $map[$token->name] = $token->value;
            }
        }

        // Second pass: aliases
        foreach ($tokens as $token) {
            if ($token->type === 'alias' && isset($map[$token->alias_of])) {
                $map[$token->name] = $map[$token->alias_of];
            }
        }

        return $map;
    }

    /** Export as CSS custom properties */
    public function toCssVariables(): string
    {
        $map = $this->resolveTokenMap();
        $lines = [":root {"];
        foreach ($map as $name => $value) {
            $cssVar = '--' . str_replace('.', '-', $name);
            $lines[] = "  {$cssVar}: {$value};";
        }
        $lines[] = "}";
        return implode("\n", $lines);
    }

    /** Export as Tailwind extend config */
    public function toTailwindConfig(): array
    {
        $map = $this->resolveTokenMap();
        $config = ['colors' => [], 'borderRadius' => [], 'spacing' => [], 'boxShadow' => [], 'fontSize' => []];

        foreach ($map as $name => $value) {
            [$category, $key] = array_pad(explode('.', $name, 2), 2, $name);
            $key = str_replace('.', '-', $key);

            match ($category) {
                'color'   => $config['colors'][$key] = $value,
                'radius'  => $config['borderRadius'][$key] = $value,
                'spacing' => $config['spacing'][$key] = $value,
                'shadow'  => $config['boxShadow'][$key] = $value,
                'font'    => $config['fontSize'][$key] = $value,
                default   => null,
            };
        }

        return array_filter($config);
    }
}
