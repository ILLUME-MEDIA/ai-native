<?php

namespace App\Services\AI\Adapters;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiAdapter implements AIProviderAdapterInterface
{
    protected string $apiKey;
    protected string $baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    protected string $model = 'gemini-1.5-flash';

    public function setApiKey(string $apiKey): void
    {
        $this->apiKey = $apiKey;
    }

    public function setBaseUrl(?string $baseUrl): void
    {
        if ($baseUrl) {
            $this->baseUrl = $baseUrl;
        }
    }

    public function setModel(string $model): void
    {
        $this->model = $model;
    }

    public function generateText(string $prompt, array $options = []): array
    {
        // Ensure model name doesn't have double prefix
        $modelId = str_replace('models/', '', $this->model);

        $response = Http::timeout(60)
            ->post("{$this->baseUrl}/models/{$modelId}:generateContent?key={$this->apiKey}", [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'temperature' => $options['temperature'] ?? 0.7,
                ]
            ]);

        if ($response->failed()) {
            $error = $response->json()['error'] ?? [];
            $message = $error['message'] ?? $response->body();

            // If model not found, suggest calling listModels
            if (isset($error['status']) && $error['status'] === 'NOT_FOUND') {
                $message .= ". Tip: Use the 'Fetch Models' button in Endpoints settings to update available models.";
            }

            throw new \Exception("Gemini API Error: " . $message);
        }

        $data = $response->json();

        if (!isset($data['candidates'][0]['content']['parts'][0]['text'])) {
            throw new \Exception("Gemini API Error: No text content returned. Response: " . json_encode($data));
        }

        return [
            'text' => $data['candidates'][0]['content']['parts'][0]['text'],
            'model' => $this->model
        ];
    }

    public function listModels(): array
    {
        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/models?key={$this->apiKey}");

            if ($response->failed()) {
                $error = $response->json()['error']['message'] ?? $response->body();
                throw new \Exception("Gemini API Error: " . $error);
            }

            $data = $response->json();
            $models = $data['models'] ?? [];

            if (empty($models)) {
                return [];
            }

            return collect($models)
                ->filter(function ($m) {
                    return isset($m['supportedGenerationMethods']) &&
                        in_array('generateContent', $m['supportedGenerationMethods']);
                })
                ->map(function ($m) {
                    return str_replace('models/', '', $m['name']);
                })
                ->values()
                ->toArray();
        } catch (\Exception $e) {
            Log::error("Gemini listModels failed: " . $e->getMessage());
            throw $e;
        }
    }
}
