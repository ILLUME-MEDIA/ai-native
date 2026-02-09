<?php

namespace App\Services\AI\Adapters;

interface AIProviderAdapterInterface
{
    public function setApiKey(string $apiKey): void;
    public function setBaseUrl(?string $baseUrl): void;
    public function setModel(string $model): void;

    /**
     * @param string $prompt
     * @param array $options
     * @return array Response with 'text' and 'model'
     */
    public function generateText(string $prompt, array $options = []): array;

    /**
     * @return array List of available models
     */
    public function listModels(): array;
}
