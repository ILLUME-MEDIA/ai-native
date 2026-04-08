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

        $response = Http::timeout(180)
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
                        'arguments' => json_decode($toolCall['function']['arguments'], true) ?? []
                    ];
                }, $message['tool_calls']),
                'text'  => $message['content'] ?? null,
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

        $response = Http::timeout(180)
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
                        'arguments' => json_decode($toolCall['function']['arguments'], true) ?? []
                    ];
                }, $message['tool_calls']),
                'text'  => $message['content'] ?? null,
                'model' => $data['model']
            ];
        }

        return [
            'text' => $message['content'] ?? '',
            'model' => $data['model']
        ];
    }

    /**
     * Streaming chat completion — calls OpenAI with stream:true and forwards
     * text chunks via $onChunk as they arrive.  Returns final result including
     * any tool_calls accumulated from the stream.
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
            'json'             => $payload,
            'stream'           => true,
            'timeout'          => 90,
            'connect_timeout'  => 15,
            'curl'             => [
                CURLOPT_NOPROGRESS      => false,
                // Return non-zero to abort curl as soon as the browser disconnects.
                CURLOPT_PROGRESSFUNCTION => function () {
                    return connection_aborted() ? 1 : 0;
                },
            ],
        ]);

        $body        = $response->getBody();
        $fullText    = '';
        $toolCalls   = [];
        $modelUsed   = $this->model;
        $buffer      = '';
        $lastFlush   = microtime(true);

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

            // Process complete lines from the buffer
            while (($pos = strpos($buffer, "\n")) !== false) {
                $line   = substr($buffer, 0, $pos);
                $buffer = substr($buffer, $pos + 1);
                $line   = trim($line);

                if ($line === '' || $line === 'data: [DONE]') {
                    continue;
                }

                if (str_starts_with($line, 'data: ')) {
                    $json = substr($line, 6);
                    $chunk = json_decode($json, true);
                    if (!$chunk) continue;

                    $modelUsed = $chunk['model'] ?? $modelUsed;
                    $delta     = $chunk['choices'][0]['delta'] ?? [];

                    // Text chunk
                    if (!empty($delta['content'])) {
                        $fullText .= $delta['content'];
                        $onChunk($delta['content']);
                        $lastFlush = microtime(true); // onChunk already flushed
                    }

                    // Tool call chunks (accumulate per index)
                    if (!empty($delta['tool_calls'])) {
                        foreach ($delta['tool_calls'] as $tc) {
                            $idx = $tc['index'] ?? 0;
                            if (!isset($toolCalls[$idx])) {
                                $toolCalls[$idx] = [
                                    'id'        => $tc['id'] ?? ('call_' . uniqid()),
                                    'name'      => $tc['function']['name'] ?? '',
                                    'arguments' => '',
                                ];
                            }
                            if (!empty($tc['id'])) {
                                $toolCalls[$idx]['id'] = $tc['id'];
                            }
                            if (!empty($tc['function']['name'])) {
                                $toolCalls[$idx]['name'] .= $tc['function']['name'];
                            }
                            if (isset($tc['function']['arguments'])) {
                                $toolCalls[$idx]['arguments'] .= $tc['function']['arguments'];
                            }
                        }
                    }
                }
            }
        }

        // Decode accumulated tool call arguments
        $parsedToolCalls = array_map(function ($tc) {
            return [
                'id'        => $tc['id'],
                'name'      => $tc['name'],
                'arguments' => json_decode($tc['arguments'], true) ?? [],
            ];
        }, array_values($toolCalls));

        $result = ['text' => $fullText, 'model' => $modelUsed];
        if (!empty($parsedToolCalls)) {
            $result['tool_calls'] = $parsedToolCalls;
        }
        return $result;
    }

    public function listModels(): array
    {
        $response = Http::timeout(30)
            ->withToken($this->apiKey)
            ->get("{$this->baseUrl}/models");

        if ($response->failed()) {
            $json = $response->json();
            // Handle both OpenAI format { error: { message } } and others like Moonshot { message }
            $errorMsg = $json['error']['message'] ?? $json['message'] ?? $response->body();
            throw new \Exception("API Error: " . $errorMsg);
        }

        return collect($response->json()['data'])
            ->pluck('id')
            ->toArray();
    }
}
