<?php

namespace App\Modules\AI\Providers;

use App\Modules\AI\AIProviderInterface;
use App\Modules\AI\AIResponse;
use Illuminate\Support\Facades\Http;

class OpenRouterProvider implements AIProviderInterface
{
    public function __construct(private readonly ?string $apiKey) {}

    public function getName(): string
    {
        return 'openrouter';
    }

    public function chat(array $messages, array $options = []): AIResponse
    {
        if (! $this->apiKey) {
            throw new \RuntimeException('OpenRouter API key is not configured');
        }

        $baseUrl = rtrim(config('ai.providers.openrouter.base_url', 'https://openrouter.ai/api/v1'), '/');
        $model = $options['model'] ?? config('ai.providers.openrouter.model', 'openai/gpt-4o-mini');

        $response = Http::timeout(45)
            ->withToken($this->apiKey)
            ->withHeaders([
                'HTTP-Referer' => config('app.url'),
                'X-Title' => config('app.name'),
            ])
            ->post("{$baseUrl}/chat/completions", [
                'model' => $model,
                'messages' => $messages,
                'temperature' => $options['temperature'] ?? 0.7,
                'max_tokens' => $options['max_tokens'] ?? 1024,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException(
                'OpenRouter error '.$response->status().': '.$response->body()
            );
        }

        $json = $response->json();
        $usage = $json['usage'] ?? [];

        return new AIResponse(
            content: $json['choices'][0]['message']['content'] ?? '',
            promptTokens: $usage['prompt_tokens'] ?? 0,
            completionTokens: $usage['completion_tokens'] ?? 0,
            model: $json['model'] ?? $model,
        );
    }

    public function stream(array $messages, array $options = []): \Generator
    {
        yield $this->chat($messages, $options)->content;
    }
}
