<?php

namespace App\Services\AI\Adapters;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\ConnectionException;

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
        $timeout = (int) ($options['timeout'] ?? 180);
        $connectTimeout = (int) ($options['connect_timeout'] ?? 15);

        $response = Http::connectTimeout($connectTimeout)
            ->timeout($timeout)
            ->retry(2, 600, function ($exception) {
                return $exception instanceof ConnectionException;
            })
            ->withToken($this->apiKey)
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
            'model' => $data['model'] ?? $this->model
        ];
    }

    /**
     * Native tool/function calling via Mistral chat completions API.
     * Mistral supports the same tool-calling format as OpenAI.
     */
    public function generateTextWithTools(array $messages, array $tools = []): array
    {
        $payload = [
            'model'       => $this->model,
            'messages'    => $messages,
            'temperature' => 0.7,
        ];

        if (!empty($tools)) {
            $payload['tools']       = $tools;
            $payload['tool_choice'] = 'auto';
        }

        // Retry up to 3 times with backoff for rate limit errors
        $maxRetries = 3;
        $response = null;
        for ($attempt = 0; $attempt < $maxRetries; $attempt++) {
            $response = Http::connectTimeout(15)
                ->timeout(180)
                ->withToken($this->apiKey)
                ->withHeaders([
                    'Accept'       => 'application/json',
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->baseUrl}/chat/completions", $payload);

            if ($response->successful()) break;

            // Rate limit (429) — wait and retry
            if ($response->status() === 429) {
                $retryAfter = (int) ($response->header('Retry-After') ?: (2 ** ($attempt + 1)));
                $retryAfter = min($retryAfter, 30); // cap at 30s
                sleep($retryAfter);
                continue;
            }

            break; // non-retryable error
        }

        if ($response->failed()) {
            $body = $response->json();
            $errMsg = $body['message'] ?? ($body['error']['message'] ?? $response->body());
            throw new \Exception("Mistral API Error: " . $errMsg);
        }

        $data    = $response->json();
        $message = $data['choices'][0]['message'] ?? [];

        // Native tool calls returned
        if (!empty($message['tool_calls'])) {
            return [
                'tool_calls' => array_map(function ($tc) {
                    $args = $tc['function']['arguments'] ?? '{}';
                    return [
                        'id'        => $tc['id'] ?? ('call_' . uniqid()),
                        'name'      => $tc['function']['name'] ?? 'unknown',
                        'arguments' => is_string($args) ? (json_decode($args, true) ?? []) : $args,
                    ];
                }, $message['tool_calls']),
                'text'  => $message['content'] ?? null,
                'model' => $data['model'] ?? $this->model,
            ];
        }

        return [
            'text'  => $message['content'] ?? '',
            'model' => $data['model'] ?? $this->model,
        ];
    }

    /**
     * Streaming chat completion — Mistral supports the same SSE format as OpenAI.
     */
    public function generateTextStream(array $messages, array $tools, callable $onChunk, ?callable $onProgress = null): array
    {
        $payload = [
            'model'       => $this->model,
            'messages'    => $messages,
            'temperature' => 0.7,
            'stream'      => true,
        ];

        if (!empty($tools)) {
            $payload['tools']       = $tools;
            $payload['tool_choice'] = 'auto';
        }

        $client = new \GuzzleHttp\Client();

        $response = $client->post("{$this->baseUrl}/chat/completions", [
            'headers' => [
                'Authorization' => "Bearer {$this->apiKey}",
                'Content-Type'  => 'application/json',
                'Accept'        => 'text/event-stream',
            ],
            'json'            => $payload,
            'stream'          => true,
            'timeout'         => 90,
            'connect_timeout' => 15,
            'curl'            => [
                CURLOPT_NOPROGRESS      => false,
                // Return non-zero to abort curl as soon as the browser disconnects.
                CURLOPT_PROGRESSFUNCTION => function () {
                    return connection_aborted() ? 1 : 0;
                },
            ],
        ]);

        $body      = $response->getBody();
        $fullText  = '';
        $toolCalls = [];
        $modelUsed = $this->model;
        $buffer    = '';
        $lastFlush = microtime(true);

        while (!$body->eof()) {
            $buffer .= $body->read(512);

            // Keepalive every 2s — critical when AI emits only tool_call deltas
            // (no text chunks), so the browser receives a named SSE event and its
            // silence-detection timer gets reset.
            $now = microtime(true);
            if ($now - $lastFlush >= 2.0) {
                if ($onProgress) $onProgress();
                if (ob_get_level() > 0) { @ob_flush(); }
                @flush();
                $lastFlush = $now;
            }

            while (($pos = strpos($buffer, "\n")) !== false) {
                $line   = substr($buffer, 0, $pos);
                $buffer = substr($buffer, $pos + 1);
                $line   = trim($line);

                if ($line === '' || $line === 'data: [DONE]') continue;

                if (str_starts_with($line, 'data: ')) {
                    $chunk = json_decode(substr($line, 6), true);
                    if (!$chunk) continue;

                    $modelUsed = $chunk['model'] ?? $modelUsed;
                    $delta     = $chunk['choices'][0]['delta'] ?? [];

                    if (!empty($delta['content'])) {
                        $fullText .= $delta['content'];
                        $onChunk($delta['content']);
                        $lastFlush = microtime(true); // onChunk already flushed
                    }

                    if (!empty($delta['tool_calls'])) {
                        foreach ($delta['tool_calls'] as $tc) {
                            $idx = $tc['index'] ?? 0;
                            if (!isset($toolCalls[$idx])) {
                                $toolCalls[$idx] = ['id' => $tc['id'] ?? ('call_' . uniqid()), 'name' => '', 'arguments' => ''];
                            }
                            if (!empty($tc['id'])) $toolCalls[$idx]['id'] = $tc['id'];
                            if (!empty($tc['function']['name'])) $toolCalls[$idx]['name'] .= $tc['function']['name'];
                            if (isset($tc['function']['arguments'])) $toolCalls[$idx]['arguments'] .= $tc['function']['arguments'];
                        }
                    }
                }
            }
        }

        $parsedToolCalls = array_map(fn($tc) => [
            'id'        => $tc['id'],
            'name'      => $tc['name'],
            'arguments' => json_decode($tc['arguments'], true) ?? [],
        ], array_values($toolCalls));

        $result = ['text' => $fullText, 'model' => $modelUsed];
        if (!empty($parsedToolCalls)) $result['tool_calls'] = $parsedToolCalls;
        return $result;
    }

    public function listModels(): array
    {
        $response = Http::timeout(30)
            ->withToken($this->apiKey)
            ->withHeaders([
                'Accept' => 'application/json',
            ])
            ->get("{$this->baseUrl}/models");

        if ($response->failed()) {
            throw new \Exception("Mistral API Error: " . ($response->json()['message'] ?? $response->body()));
        }

        return collect($response->json()['data'])
            ->pluck('id')
            ->toArray();
    }
}
