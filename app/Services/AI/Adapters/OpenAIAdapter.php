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
        $payload = [
            'model' => $this->model,
            'messages' => [
                ['role' => 'user', 'content' => $prompt]
            ],
            'temperature' => $options['temperature'] ?? 0.7,
        ];

        // Add tools if provided
        if (!empty($options['tools'])) {
            $payload['tools'] = $options['tools'];
            $payload['tool_choice'] = $options['tool_choice'] ?? 'auto';
        }

        $response = Http::timeout(60)
            ->withToken($this->apiKey)
            ->post("{$this->baseUrl}/chat/completions", $payload);

        if ($response->failed()) {
            throw new \Exception("OpenAI API Error: " . ($response->json()['error']['message'] ?? $response->body()));
        }

        $data = $response->json();
        $message = $data['choices'][0]['message'];

        // Check if AI wants to call tools
        if (isset($message['tool_calls']) && !empty($message['tool_calls'])) {
            return [
                'tool_calls' => array_map(function($toolCall) {
                    return [
                        'id' => $toolCall['id'],
                        'name' => $toolCall['function']['name'],
                        'arguments' => json_decode($toolCall['function']['arguments'], true)
                    ];
                }, $message['tool_calls']),
                'model' => $data['model']
            ];
        }

        return [
            'text' => $message['content'] ?? '',
            'model' => $data['model']
        ];
    }

    public function generateTextWithTools(array $messages, array $tools = []): array
    {
        $payload = [
            'model' => $this->model,
            'messages' => $messages,
            'temperature' => 0.7,
        ];

        if (!empty($tools)) {
            $payload['tools'] = $tools;
            $payload['tool_choice'] = 'auto';
        }

        $response = Http::timeout(60)
            ->withToken($this->apiKey)
            ->post("{$this->baseUrl}/chat/completions", $payload);

        if ($response->failed()) {
            throw new \Exception("OpenAI API Error: " . ($response->json()['error']['message'] ?? $response->body()));
        }

        $data = $response->json();
        $message = $data['choices'][0]['message'];

        // Check if AI wants to call tools
        if (isset($message['tool_calls']) && !empty($message['tool_calls'])) {
            return [
                'tool_calls' => array_map(function($toolCall) {
                    return [
                        'id' => $toolCall['id'],
                        'name' => $toolCall['function']['name'],
                        'arguments' => json_decode($toolCall['function']['arguments'], true)
                    ];
                }, $message['tool_calls']),
                'model' => $data['model']
            ];
        }

        return [
            'text' => $message['content'] ?? '',
            'model' => $data['model']
        ];
    }

    public function listModels(): array
    {
        $response = Http::timeout(30)
            ->withToken($this->apiKey)
            ->get("{$this->baseUrl}/models");

        if ($response->failed()) {
            throw new \Exception("OpenAI API Error: " . ($response->json()['error']['message'] ?? $response->body()));
        }

        return collect($response->json()['data'])
            ->pluck('id')
            ->toArray();
    }
}
