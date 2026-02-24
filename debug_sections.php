<?php
// Quick debug script - delete after use
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$app->boot();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "=== DB Debug ===" . PHP_EOL;
try {
    $exists = Schema::hasTable('case_study_sections');
    echo "case_study_sections exists: " . ($exists ? 'YES' : 'NO') . PHP_EOL;

    if ($exists) {
        $count = DB::table('case_study_sections')->count();
        echo "Sections total rows: " . $count . PHP_EOL;
        $sample = DB::table('case_study_sections')->first();
        if ($sample) {
            echo "Sample: id={$sample->id}, type={$sample->type}, cs_id={$sample->case_study_id}" . PHP_EOL;
            echo "Content preview: " . substr($sample->content, 0, 150) . PHP_EOL;
        }
    }

    $exists2 = Schema::hasTable('case_studies');
    echo "case_studies exists: " . ($exists2 ? 'YES' : 'NO') . PHP_EOL;
    if ($exists2) {
        $count2 = DB::table('case_studies')->count();
        echo "Case studies total rows: " . $count2 . PHP_EOL;
        $first = DB::table('case_studies')->first();
        if ($first) {
            echo "First CS: id={$first->id}, title=" . substr($first->title, 0, 50) . PHP_EOL;

            // Simulate getItemSections
            $sections = DB::table('case_study_sections')
                ->where('case_study_id', $first->id)
                ->orderBy('order')
                ->get();
            echo "Sections for CS #{$first->id}: " . $sections->count() . PHP_EOL;
            foreach ($sections as $s) {
                echo "  - id={$s->id}, type={$s->type}, heading=" . substr($s->heading ?? '', 0, 30) . PHP_EOL;
            }
        }
    }

    $existsG = Schema::hasTable('case_study_groups');
    echo "case_study_groups exists: " . ($existsG ? 'YES' : 'NO') . PHP_EOL;

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . PHP_EOL;
    echo "File: " . $e->getFile() . " Line: " . $e->getLine() . PHP_EOL;
}
