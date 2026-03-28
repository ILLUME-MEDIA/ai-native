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

    // tokenGroups() reserved for future use (DsTokenGroup model not yet created)

    /** Resolve all tokens for this theme as a flat key→value map */
    public function resolveTokenMap(): array
    {
        $tokens = $this->tokens()->get();
        $map    = [];

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

    /**
     * Resolve tokens as a deeply nested map, grouped by category.
     *
     * Flat:   { "color.primary": "#405189", "spacing.md": "16px" }
     * Nested: { "color": { "primary": "#405189" }, "spacing": { "md": "16px" } }
     *
     * Supports arbitrary depth — e.g. "font.size.sm" → { font: { size: { sm: "..." } } }
     */
    public function resolveNestedMap(): array
    {
        $flat   = $this->resolveTokenMap();
        $nested = [];

        foreach ($flat as $name => $value) {
            $parts = explode('.', $name);
            $ref   = &$nested;

            foreach ($parts as $i => $part) {
                if ($i === count($parts) - 1) {
                    // Leaf — store the value
                    $ref[$part] = $value;
                } else {
                    // Node — descend (or create the group)
                    if (!isset($ref[$part]) || !is_array($ref[$part])) {
                        $ref[$part] = [];
                    }
                    $ref = &$ref[$part];
                }
            }
            unset($ref);
        }

        return $nested;
    }

    /**
     * Export as CSS custom properties, grouped by category with section comments.
     *
     * Output:
     *   :root {
     *     /∗ color ∗/
     *     --color-primary: #405189;
     *     /∗ spacing ∗/
     *     --spacing-md: 16px;
     *   }
     */
    public function toCssVariables(): string
    {
        $flat   = $this->resolveTokenMap();
        $groups = [];

        // Group tokens by first segment
        foreach ($flat as $name => $value) {
            $category          = explode('.', $name)[0];
            $groups[$category][$name] = $value;
        }

        $lines = [':root {'];
        foreach ($groups as $category => $tokens) {
            $lines[] = '';
            $lines[] = "  /* {$category} */";
            foreach ($tokens as $name => $value) {
                $cssVar  = '--' . str_replace('.', '-', $name);
                $lines[] = "  {$cssVar}: {$value};";
            }
        }
        $lines[] = '}';

        return implode("\n", $lines);
    }

    /** Export as Tailwind extend config */
    public function toTailwindConfig(): array
    {
        $map    = $this->resolveTokenMap();
        $config = ['colors' => [], 'borderRadius' => [], 'spacing' => [], 'boxShadow' => [], 'fontSize' => [], 'fontFamily' => []];

        foreach ($map as $name => $value) {
            [$category, $key] = array_pad(explode('.', $name, 2), 2, $name);
            $key = str_replace('.', '-', $key);

            match ($category) {
                'color'   => $config['colors'][$key]       = $value,
                'radius'  => $config['borderRadius'][$key] = $value,
                'spacing' => $config['spacing'][$key]      = $value,
                'shadow'  => $config['boxShadow'][$key]    = $value,
                'font'    => $config['fontSize'][$key]     = $value,
                default   => null,
            };
        }

        return array_filter($config);
    }
}
