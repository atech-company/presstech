<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Bot;
use App\Models\Conversation;
use App\Models\Integration;
use App\Models\Message;
use App\Services\BotReplyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class WidgetController extends Controller
{
    public function __construct(private readonly BotReplyService $botReply) {}

    public function config(Request $request, Bot $bot): JsonResponse
    {
        $this->resolveWebsiteIntegration($request, $bot);

        return $this->success([
            'bot_id' => $bot->id,
            'name' => $bot->name,
            'description' => $bot->description,
            'avatar' => $bot->avatar,
        ]);
    }

    public function startConversation(Request $request, Bot $bot): JsonResponse
    {
        $this->resolveWebsiteIntegration($request, $bot);

        $conversation = Conversation::create([
            'bot_id' => $bot->id,
            'workspace_id' => $bot->workspace_id,
            'status' => 'active',
            'metadata' => [
                'channel' => 'website',
                'visitor' => $request->input('visitor', []),
                'page_url' => $request->input('page_url'),
            ],
        ]);

        return $this->success([
            'id' => $conversation->id,
            'bot_id' => $conversation->bot_id,
            'created_at' => $conversation->created_at->toIso8601String(),
        ], 'Conversation started', 201);
    }

    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        $conversation->loadMissing('bot');
        $this->resolveWebsiteIntegration($request, $conversation->bot);

        if (($conversation->metadata['channel'] ?? null) !== 'website') {
            return $this->error('Invalid conversation', 403);
        }

        $validated = $request->validate(['content' => 'required|string|max:10000']);

        $userMessage = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $validated['content'],
        ]);

        $reply = $this->botReply->generate($conversation->bot, $validated['content'], $conversation);

        $assistantMessage = Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $reply->content,
            'metadata' => ! empty($reply->products) ? ['products' => $reply->products] : null,
        ]);

        return $this->success([
            'user_message' => $this->formatMessage($userMessage),
            'assistant_message' => $this->formatMessage($assistantMessage),
        ]);
    }

    private function resolveWebsiteIntegration(Request $request, Bot $bot): Integration
    {
        $token = trim((string) ($request->query('token')
            ?? $request->header('X-Embed-Token')
            ?? $request->input('token')
            ?? ''));

        if ($token === '') {
            throw new AccessDeniedHttpException('Embed token required');
        }

        $integration = Integration::query()
            ->where('type', 'website')
            ->where('workspace_id', $bot->workspace_id)
            ->where('status', 'active')
            ->where('config->bot_id', $bot->id)
            ->get()
            ->first(fn (Integration $item) => ($item->config['embed_token'] ?? null) === $token);

        if (! $integration) {
            throw new AccessDeniedHttpException('Invalid embed token');
        }

        if ($bot->status === 'archived') {
            throw new AccessDeniedHttpException('Bot is not available');
        }

        return $integration;
    }

    private function formatMessage(Message $message): array
    {
        $data = [
            'id' => $message->id,
            'role' => $message->role,
            'content' => $message->content,
            'created_at' => $message->created_at->toIso8601String(),
        ];

        if (! empty($message->metadata['products'])) {
            $data['products'] = $message->metadata['products'];
        }

        return $data;
    }
}
