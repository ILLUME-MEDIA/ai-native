<?php

namespace App\Services\AI\Adapters;

use Illuminate\Support\Facades\Http;

class AnthropicAdapter implements AIProviderAdapterInterface
{
    protected string $apiKey;
    protected string $baseUrl = 'https://api.anthropic.com/v1';
    protected string $model = 'claude-sonnet-4-5';
    protected string $anthropicVersion = '2023-06-01';

    public function setApiKey(string $apiKey): void
    {
        $this->apiKey = $apiKey;
    }

    public function setBaseUrl(?string $baseUrl): void
    {
        if ($baseUrl) {
            $this->baseUrl = rtrim($baseUrl, '/');
        }
    }

    public function setModel(string $model): void
    {
        $this->model = $model;
    }

    public function generateText(string $prompt, array $options = []): array
    {
        $response = Http::timeout(60)
            ->withHeaders([
                'x-api-key' => $this->apiKey,
                'anthropic-version' => $this->anthropicVersion,
                'Content-Type' => 'application/json',
            ])
            ->post("{$this->baseUrl}/messages", [
                'model' => $this->model,
                'max_tokens' => $options['max_tokens'] ?? 8096,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

        if ($response->failed()) {
            $err = $response->json()['error']['message'] ?? $response->body();
            throw new \Exception("Anthropic API Error: {$err}");
        }

        $data = $response->json();
        $text = collect($data['content'] ?? [])
            ->where('type', 'text')
            ->pluck('text')
            ->implode('');

        return ['text' => $text, 'model' => $data['model'] ?? $this->model];
    }

    /**
     * Multi-turn conversation with tool support (used by AIManager tool loop).
     */
    public function generateTextWithTools(array $messages, array $tools = []): array
    {
        // Anthropic separates system from messages
        $system = null;
        $filteredMessages = [];
        foreach ($messages as $msg) {
            if ($msg['role'] === 'system') {
                $system = $msg['content'];
            } else {
                $filteredMessages[] = $msg;
            }
        }

        $payload = [
            'model' => $this->model,
            'max_tokens' => 8096,
            'messages' => $filteredMessages,
        ];

        if ($system) {
            $payload['system'] = $system;
        }

        if (!empty($tools)) {
            // Convert OpenAI tool format → Anthropic tool format
            $payload['tools'] = array_map(function ($tool) {
                $fn = $tool['function'] ?? $tool;
                return [
                    'name' => $fn['name'],
                    'description' => $fn['description'] ?? '',
                    'input_schema' => $fn['parameters'] ?? ['type' => 'object', 'properties' => []],
                ];
            }, $tools);
        }

        $response = Http::timeout(120)
            ->withHeaders([
                'x-api-key' => $this->apiKey,
                'anthropic-version' => $this->anthropicVersion,
                'Content-Type' => 'application/json',
            ])
            ->post("{$this->baseUrl}/messages", $payload);

        if ($response->failed()) {
            $err = $response->json()['error']['message'] ?? $response->body();
            throw new \Exception("Anthropic API Error: {$err}");
        }

        $data = $response->json();
        $content = $data['content'] ?? [];

        // Check for tool use blocks
        $toolUseBlocks = array_filter($content, fn($b) => ($b['type'] ?? '') === 'tool_use');
        if (!empty($toolUseBlocks)) {
            return [
                'tool_calls' => array_values(array_map(fn($b) => [
                    'id'        => $b['id'],
                    'name'      => $b['name'],
                    'arguments' => $b['input'] ?? [],
                ], $toolUseBlocks)),
                'model' => $data['model'] ?? $this->model,
            ];
        }

        $text = collect($content)
            ->where('type', 'text')
            ->pluck('text')
            ->implode('');

        return ['text' => $text, 'model' => $data['model'] ?? $this->model];
    }

    /**
     * Streaming response — yields text chunks via $onChunk callback.
     */
    public function generateTextStream(array $messages, array $tools, callable $onChunk): array
    {
        $system = null;
        $filteredMessages = [];
        foreach ($messages as $msg) {
            if ($msg['role'] === 'system') {
                $system = $msg['content'];
            } else {
                $filteredMessages[] = $msg;
            }
        }

        $payload = [
            'model'      => $this->model,
            'max_tokens' => 8096,
            'stream'     => true,
            'messages'   => $filteredMessages,
        ];

        if ($system) {
            $payload['system'] = $system;
        }

        if (!empty($tools)) {
            $payload['tools'] = array_map(function ($tool) {
                $fn = $tool['function'] ?? $tool;
                return [
                    'name'         => $fn['name'],
                    'description'  => $fn['description'] ?? '',
                    'input_schema' => $fn['parameters'] ?? ['type' => 'object', 'properties' => []],
                ];
            }, $tools);
        }

        $fullText  = '';
        $toolCalls = [];
        $modelUsed = $this->model;

        $response = Http::timeout(120)
            ->withHeaders([
                'x-api-key'         => $this->apiKey,
                'anthropic-version' => $this->anthropicVersion,
                'Content-Type'      => 'application/json',
                'Accept'            => 'text/event-stream',
            ])
            ->withOptions(['stream' => true])
            ->post("{$this->baseUrl}/messages", $payload);

        if ($response->failed()) {
            $err = $response->json()['error']['message'] ?? $response->body();
            throw new \Exception("Anthropic API Error: {$err}");
        }

        $buffer = '';
        $body   = $response->toPsrResponse()->getBody();

        while (!$body->eof()) {
            $chunk  = $body->read(4096);
            $buffer .= $chunk;
            $lines  = explode("\n", $buffer);
            $buffer = array_pop($lines); // keep incomplete line

            $currentEvent = '';
            foreach ($lines as $line) {
                $line = rtrim($line);
                if (str_starts_with($line, 'event:')) {
                    $currentEvent = trim(substr($line, 6));
                } elseif (str_starts_with($line, 'data:')) {
                    $data = trim(substr($line, 5));
                    if ($data === '[DONE]' || $data === '') continue;
                    $parsed = json_decode($data, true);
                    if (!$parsed) continue;

                    if ($currentEvent === 'content_block_delta') {
                        $delta = $parsed['delta'] ?? [];
                        if (($delta['type'] ?? '') === 'text_delta' && isset($delta['text'])) {
                            $fullText .= $delta['text'];
                            $onChunk($delta['text']);
                        }
                    } elseif ($currentEvent === 'message_start') {
                        $modelUsed = $parsed['message']['model'] ?? $this->model;
                    }
                }
            }
        }

        return ['text' => $fullText, 'tool_calls' => $toolCalls, 'model' => $modelUsed];
    }

    public function listModels(): array
    {
        // Anthropic does not have a public /models list endpoint; return known models.
        return [
            'claude-opus-4-5',
            'claude-sonnet-4-5',
            'claude-haiku-4-5-20251001',
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229',
        ];
    }
}
