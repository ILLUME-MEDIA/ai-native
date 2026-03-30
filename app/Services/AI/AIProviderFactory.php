<?php

namespace App\Services\AI;

use App\Services\AI\Adapters\AIProviderAdapterInterface;
use App\Services\AI\Adapters\AnthropicAdapter;
use App\Services\AI\Adapters\OpenAIAdapter;
use App\Services\AI\Adapters\GeminiAdapter;
use App\Services\AI\Adapters\MistralAdapter;
use App\Models\AIEndpoint;

class AIProviderFactory
{
    public static function make(AIEndpoint $endpoint): AIProviderAdapterInterface
    {
        $adapter = match ($endpoint->provider) {
            'openai' => new OpenAIAdapter(),
            'anthropic' => new AnthropicAdapter(),
            'google' => new GeminiAdapter(),
            'gemini' => new GeminiAdapter(),
            'mistral' => new MistralAdapter(),
            'custom' => new OpenAIAdapter(), // Custom usually follows OpenAI format
            default => throw new \Exception("Unsupported provider: {$endpoint->provider}"),
        };

        $adapter->setApiKey($endpoint->api_key);
        $adapter->setBaseUrl($endpoint->base_url);

        if ($endpoint->default_model) {
            $adapter->setModel($endpoint->default_model);
        }

        return $adapter;
    }
}
