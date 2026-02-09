<?php

namespace App\Services\AI\Adapters;

use Illuminate\Support\Facades\Http;

class OpenAIAdapter implements AIProviderAdapterInterface
{
    protected string $apiKey;
    protected string $baseUrl = 'https://api.openai.com/v1';
    protected string $model = 'gpt-3.5-turbo';

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
            ->post("{$this->baseUrl}/chat/completions", [
                'model' => $this->model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => $options['temperature'] ?? 0.7,
            ]);

        if ($response->failed()) {
            throw new \Exception("OpenAI API Error: " . ($response->json()['error']['message'] ?? $response->body()));
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
            ->get("{$this->baseUrl}/models");

        if ($response->failed()) {
            throw new \Exception("OpenAI API Error: " . ($response->json()['error']['message'] ?? $response->body()));
        }

        return collect($response->json()['data'])
            ->pluck('id')
            ->toArray();
    }
}
