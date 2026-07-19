<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\AuthorizesWorkspace;
use App\Http\Controllers\Controller;
use App\Models\Bot;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\BotReplyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    use AuthorizesWorkspace;

    public function __construct(private readonly BotReplyService $botReply) {}

    public function index(Request $request, Bot $bot): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $bot);

        $conversations = Conversation::where('bot_id', $bot->id)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($c) => $this->formatConversation($c));

        return $this->success($conversations);
    }

    public function store(Request $request, Bot $bot): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $bot);

        $conversation = Conversation::create([
            'bot_id' => $bot->id,
            'workspace_id' => $bot->workspace_id,
            'status' => 'active',
            'metadata' => $request->input('metadata', []),
        ]);

        return $this->success($this->formatConversation($conversation), 'Conversation started', 201);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $conversation);
        $conversation->load('messages');

        return $this->success([
            ...$this->formatConversation($conversation),
            'messages' => $conversation->messages->map(fn ($m) => $this->formatMessage($m)),
        ]);
    }

    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $conversation);

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

    private function formatConversation(Conversation $conversation): array
    {
        return [
            'id' => $conversation->id,
            'bot_id' => $conversation->bot_id,
            'workspace_id' => $conversation->workspace_id,
            'status' => $conversation->status,
            'created_at' => $conversation->created_at->toIso8601String(),
        ];
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
