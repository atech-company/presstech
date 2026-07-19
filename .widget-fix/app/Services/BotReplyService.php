<?php

namespace App\Services;

use App\Models\Bot;
use App\Models\Conversation;
use App\Models\KnowledgeChunk;
use App\Models\Workflow;
use App\Modules\AI\AIProviderManager;
use App\Modules\Workflows\Execution\WorkflowRunner;
use Illuminate\Support\Facades\Log;

class BotReplyService
{
    public function __construct(private readonly ProductSearchService $products) {}

    public function generate(Bot $bot, string $userContent, ?Conversation $conversation = null): BotReply
    {
        $workflow = Workflow::where('bot_id', $bot->id)->where('status', 'active')->first();

        if ($workflow) {
            $version = $workflow->versions()->where('status', 'published')->latest('version')->first()
                ?? $workflow->versions()->latest('version')->first();

            if ($version) {
                try {
                    $runner = app(WorkflowRunner::class);
                    $execution = $runner->start($version, [
                        'conversation' => ['user_message' => $userContent],
                        'workflow' => ['workspace_id' => $bot->workspace_id],
                    ]);

                    $lastStep = $execution->steps()->latest()->first();
                    if ($lastStep?->output) {
                        $message = $lastStep->output['message'] ?? $lastStep->output['content'] ?? null;
                        if (is_string($message) && trim($message) !== '') {
                            return new BotReply($message);
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning('Workflow reply failed, falling back to AI', [
                        'bot_id' => $bot->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        $searchQuery = $this->products->resolveSearchQuery($userContent, $conversation);
        $wantsCards = $this->products->wantsProductCards($userContent, $conversation);
        $context = $this->searchKnowledge($bot, $searchQuery);
        $matchedProducts = $wantsCards
            ? $this->findProducts($bot, $searchQuery, $context, $conversation)
            : [];

        if (! empty($matchedProducts) && $wantsCards) {
            return new BotReply(
                $this->products->buildIntro($matchedProducts, $searchQuery),
                $matchedProducts
            );
        }

        if (! $this->hasAnyAiKey()) {
            Log::error('No AI provider API key configured on server', ['bot_id' => $bot->id]);

            if (! empty($matchedProducts)) {
                return new BotReply(
                    $this->products->buildIntro($matchedProducts, $searchQuery),
                    $matchedProducts
                );
            }

            return new BotReply('AI is not configured yet. Please add an API key in server settings.');
        }

        try {
            $system = $this->buildSystemPrompt($bot, $context, $matchedProducts);
            $messages = $this->buildMessages($system, $userContent, $conversation);

            $reply = $this->generateWithAi($bot, $messages);

            if ($reply !== null) {
                if (! empty($matchedProducts) && $this->products->looksLikeClarifyingQuestions($reply)) {
                    $reply = $this->products->buildIntro($matchedProducts, $searchQuery);
                }

                return new BotReply($reply, $wantsCards ? $matchedProducts : []);
            }
        } catch (\Throwable $e) {
            Log::error('AI reply failed', [
                'bot_id' => $bot->id,
                'error' => $e->getMessage(),
            ]);
        }

        if (! empty($matchedProducts)) {
            return new BotReply(
                $this->products->buildIntro($matchedProducts, $searchQuery),
                $matchedProducts
            );
        }

        return new BotReply('Sorry, I could not generate a reply right now. Please try again in a moment.');
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function findProducts(Bot $bot, string $searchQuery, string $context, ?Conversation $conversation): array
    {
        $matchedProducts = [];

        if ($this->products->shouldSearch($searchQuery, $conversation) || $this->products->isProductQuery($searchQuery)) {
            $matchedProducts = $this->products->search($bot, $searchQuery);
        }

        if (empty($matchedProducts) && $context !== '' && $this->products->isProductQuery($searchQuery)) {
            $matchedProducts = $this->products->extractFromText($context, $searchQuery);
        }

        if (empty($matchedProducts) && $conversation && $this->products->isProductQuery($searchQuery)) {
            $matchedProducts = $this->products->extractFromConversation($bot, $conversation, $searchQuery);
        }

        return $matchedProducts;
    }

    /**
     * @param  list<array<string, mixed>>  $products
     */
    private function buildSystemPrompt(Bot $bot, string $context, array $products): string
    {
        $instructions = trim((string) ($bot->instructions ?? ''));

        if ($instructions === '') {
            $instructions = "You are {$bot->name}, a helpful AI assistant for this business.";
            if ($bot->description) {
                $instructions .= ' '.$bot->description;
            }
            $instructions .= ' Answer clearly and helpfully using the knowledge provided when relevant.';
        }

        if ($context !== '') {
            $instructions .= "\n\nUse the following knowledge from the website/docs when answering:\n\n".$context;
        }

        if (! empty($products)) {
            $instructions .= "\n\nPRODUCT CARDS RULE: Product cards with image, price, description, and Order button are rendered automatically below your message.";
            $instructions .= "\nWrite ONLY 1 short sentence intro. Do NOT ask about budget, specs, or preferences. Do NOT list products in text.";
            $instructions .= "\nNever say you cannot show images — cards display them.";
            $instructions .= "\n\nMatched products:\n".json_encode($products, JSON_UNESCAPED_UNICODE);
        }

        return $instructions;
    }

    /**
     * @param  list<array{role: string, content: string}>  $messages
     */
    private function generateWithAi(Bot $bot, array $messages): ?string
    {
        $manager = new AIProviderManager;
        $settings = $bot->settings ?? [];
        $preferred = $settings['ai_provider'] ?? config('ai.default', 'openrouter');
        $providers = array_values(array_unique(array_merge(
            [$preferred],
            $manager->configuredProviders(),
            ['openrouter', 'deepseek', 'openai']
        )));

        foreach ($providers as $provider) {
            if (! config("ai.providers.{$provider}.api_key")) {
                continue;
            }

            try {
                $ai = $manager->resolve($provider);
                $model = $manager->modelForProvider($provider, $settings['ai_model'] ?? null);
                $response = $ai->chat($messages, array_filter(['model' => $model]));
                $content = trim($response->content);

                if ($content !== '') {
                    return $content;
                }
            } catch (\Throwable $e) {
                Log::warning('AI provider attempt failed', [
                    'bot_id' => $bot->id,
                    'provider' => $provider,
                    'model' => $manager->modelForProvider($provider, $settings['ai_model'] ?? null),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return null;
    }

    /**
     * @return list<array{role: string, content: string}>
     */
    private function buildMessages(string $system, string $userContent, ?Conversation $conversation): array
    {
        $messages = [['role' => 'system', 'content' => $system]];

        if ($conversation) {
            $history = $conversation->messages()
                ->orderBy('created_at')
                ->limit(20)
                ->get(['role', 'content']);

            foreach ($history as $message) {
                if (in_array($message->role, ['user', 'assistant'], true)) {
                    $messages[] = ['role' => $message->role, 'content' => $message->content];
                }
            }
        }

        if (empty($messages) || end($messages)['content'] !== $userContent) {
            $messages[] = ['role' => 'user', 'content' => $userContent];
        }

        return $messages;
    }

    private function hasAnyAiKey(): bool
    {
        foreach (['openrouter', 'deepseek', 'openai'] as $provider) {
            if (config("ai.providers.{$provider}.api_key")) {
                return true;
            }
        }

        return false;
    }

    private function searchKnowledge(Bot $bot, string $query): string
    {
        $terms = array_values(array_filter(
            preg_split('/\s+/', strtolower($query)) ?: [],
            fn ($word) => strlen($word) >= 2 || preg_match('/^t\d+$/i', $word)
        ));

        $chunkQuery = KnowledgeChunk::query()
            ->whereHas('source', function ($q) use ($bot) {
                $q->where('workspace_id', $bot->workspace_id)
                    ->where('status', 'indexed')
                    ->where(function ($inner) use ($bot) {
                        $inner->whereNull('bot_id')->orWhere('bot_id', $bot->id);
                    });
            });

        if (! empty($terms)) {
            $chunkQuery->where(function ($q) use ($terms, $query) {
                $q->where('content', 'like', '%'.$query.'%');
                foreach (array_slice($terms, 0, 8) as $term) {
                    $q->orWhere('content', 'like', '%'.$term.'%');
                }
                if (preg_match('/t\d+/i', $query)) {
                    $q->orWhere('content', 'like', '%thinkpad%');
                }
            });
        }

        $chunks = $chunkQuery->limit(8)->pluck('content')->toArray();

        return implode("\n\n---\n\n", $chunks);
    }
}
