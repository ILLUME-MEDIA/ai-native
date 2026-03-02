<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * Tax lookup service using Avalara ZIP-based CSV tax rate tables.
 *
 * Data: TAXRATES_ZIP5/ folder — one CSV per US state.
 * CSV columns: State, ZipCode, TaxRegionName, EstimatedCombinedRate,
 *              StateRate, EstimatedCountyRate, EstimatedCityRate,
 *              EstimatedSpecialRate, RiskLevel
 *
 * Results are cached per ZIP code (24 hours).
 */
class TaxService
{
    /** Path to the CSV directory (absolute). */
    private string $csvDir;

    public function __construct()
    {
        $this->csvDir = base_path('TAXRATES_ZIP5');
    }

    /**
     * Look up tax rates by ZIP code.
     *
     * @param  string $zip  5-digit ZIP code
     * @return array|null   Tax data array, or null if ZIP not found
     */
    public function lookup(string $zip): ?array
    {
        $zip = str_pad(trim($zip), 5, '0', STR_PAD_LEFT);

        return Cache::remember("tax_zip_{$zip}", now()->addHours(24), function () use ($zip) {
            return $this->searchAllFiles($zip);
        });
    }

    /**
     * Calculate tax amount for a given subtotal and ZIP code.
     *
     * @param  float  $subtotal  Order subtotal in dollars
     * @param  string $zip       5-digit ZIP code
     * @return array{
     *   found: bool,
     *   zip_code: string,
     *   tax_region: string|null,
     *   state: string|null,
     *   tax_rate: float,
     *   tax_percentage: string,
     *   tax_amount: string,
     *   subtotal: string,
     *   total: string,
     *   risk_level: int,
     *   breakdown: array
     * }
     */
    public function calculate(float $subtotal, string $zip): array
    {
        $row = $this->lookup($zip);

        if (!$row) {
            return [
                'found'          => false,
                'zip_code'       => $zip,
                'tax_region'     => null,
                'state'          => null,
                'tax_rate'       => 0.0,
                'tax_percentage' => '0.00%',
                'tax_amount'     => number_format(0, 2, '.', ''),
                'subtotal'       => number_format($subtotal, 2, '.', ''),
                'total'          => number_format($subtotal, 2, '.', ''),
                'risk_level'     => 0,
                'breakdown'      => [
                    'state_rate'   => 0.0,
                    'county_rate'  => 0.0,
                    'city_rate'    => 0.0,
                    'special_rate' => 0.0,
                ],
            ];
        }

        $rate       = $row['estimated_combined_rate'];
        $taxAmount  = round($subtotal * $rate, 2);
        $total      = $subtotal + $taxAmount;

        return [
            'found'          => true,
            'zip_code'       => $row['zip_code'],
            'tax_region'     => $row['tax_region_name'],
            'state'          => $row['state'],
            'tax_rate'       => $rate,
            'tax_percentage' => number_format($rate * 100, 4) . '%',
            'tax_amount'     => number_format($taxAmount, 2, '.', ''),
            'subtotal'       => number_format($subtotal, 2, '.', ''),
            'total'          => number_format($total, 2, '.', ''),
            'risk_level'     => $row['risk_level'],
            'breakdown'      => [
                'state_rate'   => $row['state_rate'],
                'county_rate'  => $row['estimated_county_rate'],
                'city_rate'    => $row['estimated_city_rate'],
                'special_rate' => $row['estimated_special_rate'],
            ],
        ];
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Scan all state CSV files for the given ZIP code.
     * Searches each file line by line; exits as soon as the ZIP is found.
     */
    private function searchAllFiles(string $zip): ?array
    {
        $pattern = ',' . $zip . ',';
        $files   = glob($this->csvDir . '/TAXRATES_ZIP5_*.csv') ?: [];

        foreach ($files as $file) {
            $result = $this->searchFile($file, $pattern);
            if ($result !== null) {
                return $result;
            }
        }

        return null;
    }

    /**
     * Scan a single CSV file for the ZIP code pattern.
     *
     * @param  string $file    Absolute path to the CSV file
     * @param  string $pattern e.g. ",90001,"
     * @return array|null
     */
    private function searchFile(string $file, string $pattern): ?array
    {
        $handle = @fopen($file, 'r');
        if ($handle === false) {
            return null;
        }

        fgets($handle); // skip header row

        while (($line = fgets($handle)) !== false) {
            if (str_contains($line, $pattern)) {
                fclose($handle);
                return $this->parseLine($line);
            }
        }

        fclose($handle);
        return null;
    }

    /**
     * Parse a single CSV line into a structured array.
     *
     * Columns: State, ZipCode, TaxRegionName, EstimatedCombinedRate,
     *          StateRate, EstimatedCountyRate, EstimatedCityRate,
     *          EstimatedSpecialRate, RiskLevel
     */
    private function parseLine(string $line): array
    {
        $row = str_getcsv(trim($line));

        return [
            'state'                   => $row[0] ?? '',
            'zip_code'                => $row[1] ?? '',
            'tax_region_name'         => $row[2] ?? '',
            'estimated_combined_rate' => isset($row[3]) ? (float) $row[3] : 0.0,
            'state_rate'              => isset($row[4]) ? (float) $row[4] : 0.0,
            'estimated_county_rate'   => isset($row[5]) ? (float) $row[5] : 0.0,
            'estimated_city_rate'     => isset($row[6]) ? (float) $row[6] : 0.0,
            'estimated_special_rate'  => isset($row[7]) ? (float) $row[7] : 0.0,
            'risk_level'              => isset($row[8]) ? (int) $row[8] : 0,
        ];
    }
}
