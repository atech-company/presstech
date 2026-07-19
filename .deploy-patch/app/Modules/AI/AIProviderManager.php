<?php

namespace App\Modules\AI;

use App\Modules\AI\Providers\DeepSeekProvider;
use App\Modules\AI\Providers\OpenAIProvider;
use App\Modules\AI\Providers\OpenRouterProvider;

class AIProviderManager
{
    /** @var list<string> */
    private const FALLBACK_ORDER = ['openrouter', 'deepseek', 'openai'];

    private array $providers = [];

    public function __construct()
    {
        $this->providers = [
            'openrouter' => OpenRouterProvider::class,
            'deepseek' => DeepSeekProvider::class,
            'openai' => OpenAIProvider::class,
        ];
    }

    public function resolve(string $provider, ?string $apiKey = null): AIProviderInterface
    {
        if (! isset($this->providers[$provider])) {
            throw new \InvalidArgumentException("Unknown AI provider: {$provider}");
        }

        $key = $apiKey ?? config("ai.providers.{$provider}.api_key");
        if (! $key) {
            throw new \InvalidArgumentException("No API key configured for provider: {$provider}");
        }

        $class = $this->providers[$provider];

        return new $class($key);
    }

    public function available(): array
    {
        return array_keys($this->providers);
    }

    /** @return list<string> */
    public function configuredProviders(): array
    {
        return array_values(array_filter(
            self::FALLBACK_ORDER,
            fn (string $provider) => ! empty(config("ai.providers.{$provider}.api_key"))
        ));
    }

    public function resolveForBot(\App\Models\Bot $bot): AIProviderInterface
    {
        return $this->resolve($this->resolveProviderForBot($bot));
    }

    public function modelForBot(\App\Models\Bot $bot): ?string
    {
        $settings = $bot->settings ?? [];
        $provider = $this->resolveProviderForBot($bot);

        return $this->modelForProvider($provider, $settings['ai_model'] ?? null);
    }

    public function modelForProvider(string $provider, ?string $model = null): string
    {
        $models = config("ai.providers.{$provider}.models", []);

        if ($model && array_key_exists($model, $models)) {
            return $model;
        }

        if ($provider === 'openrouter' && $model) {
            if (str_contains($model, 'deepseek')) {
                return 'deepseek/deepseek-chat';
            }
            if (str_contains($model, 'gpt-4o') && ! str_contains($model, '/')) {
                return 'openai/'.$model;
            }
        }

        return config("ai.providers.{$provider}.model");
    }

    private function resolveProviderForBot(\App\Models\Bot $bot): string
    {
        $settings = $bot->settings ?? [];
        $preferred = $settings['ai_provider'] ?? config('ai.default', 'openrouter');

        if (config("ai.providers.{$preferred}.api_key")) {
            return $preferred;
        }

        foreach (self::FALLBACK_ORDER as $fallback) {
            if (config("ai.providers.{$fallback}.api_key")) {
                return $fallback;
            }
        }

        return $preferred;
    }
}
