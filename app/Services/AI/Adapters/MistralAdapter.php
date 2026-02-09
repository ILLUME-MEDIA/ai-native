<?php

namespace App\Services\AI\Adapters;

use Illuminate\Support\Facades\Http;

class MistralAdapter implements AIProviderAdapterInterface
{
    protected string $apiKey;
    protected string $baseUrl = 'https://api.mistral.ai/v1';
    protected string $model = 'mistral-tiny';

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
        $response = Http::withToken($this->apiKey)
            ->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])
            ->post("{$this->baseUrl}/chat/completions", [
                'model' => $this->model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => $options['temperature'] ?? 0.7,
            ]);

        if ($response->failed()) {
            throw new \Exception("Mistral API Error: " . ($response->json()['message'] ?? $response->body()));
        }

        $data = $response->json();
        return [
            'text' => $data['choices'][0]['message']['content'],
            'model' => $data['model']
        ];
    }

    public function listModels(): array
    {
        $response = Http::withToken($this->apiKey)
            ->withHeaders([
                'Accept' => 'application/json',
            ])
            ->get("{$this->baseUrl}/models");

        if ($response->failed()) {
            throw new \Exception("Mistral API Error: " . ($response->json()['message'] ?? $response->body()));
        }

        // Mistral returns a list of objects with 'id'
        return collect($response->json()['data'])
            ->pluck('id')
            ->toArray();
    }
}
