<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Bot;
use App\Models\Conversation;
use App\Models\Integration;
use App\Models\Message;
use App\Services\BotReplyService;
use App\Services\WhatsApp\WasenderClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function __construct(private readonly BotReplyService $botReply) {}

    public function handle(Request $request, Integration $integration): JsonResponse
    {
        if ($integration->type !== 'whatsapp' || $integration->status !== 'active') {
            return response()->json(['received' => true]);
        }

        $event = $request->input('event');
        $incomingEvents = ['messages.received', 'messages.upsert', 'messages.personal.received'];

        if (! in_array($event, $incomingEvents, true)) {
            return response()->json(['received' => true]);
        }

        $message = $request->input('data.messages');
        if (! is_array($message) || ($message['key']['fromMe'] ?? false)) {
            return response()->json(['received' => true]);
        }

        $text = trim($message['messageBody'] ?? $message['message']['conversation'] ?? '');
        if ($text === '') {
            return response()->json(['received' => true]);
        }

        $botId = $integration->config['bot_id'] ?? null;
        if (! $botId) {
            Log::warning('WhatsApp webhook received but no bot_id configured', ['integration_id' => $integration->id]);

            return response()->json(['received' => true, 'error' => 'no_bot_configured']);
        }

        $bot = Bot::find($botId);
        if (! $bot || $bot->workspace_id !== $integration->workspace_id) {
            return response()->json(['received' => true, 'error' => 'invalid_bot']);
        }

        $senderPhone = $message['key']['cleanedSenderPn']
            ?? $message['key']['cleanedParticipantPn']
            ?? null;

        $remoteJid = $message['key']['remoteJid'] ?? null;
        $channelId = $senderPhone ?: ($remoteJid ? preg_replace('/@.*/', '', $remoteJid) : null);

        if (! $channelId) {
            return response()->json(['received' => true, 'error' => 'no_sender']);
        }

        $conversation = Conversation::where('bot_id', $bot->id)
            ->where('workspace_id', $bot->workspace_id)
            ->where('metadata->channel', 'whatsapp')
            ->where('metadata->phone', $channelId)
            ->first();

        if (! $conversation) {
            $conversation = Conversation::create([
                'bot_id' => $bot->id,
                'workspace_id' => $bot->workspace_id,
                'status' => 'active',
                'metadata' => [
                    'channel' => 'whatsapp',
                    'phone' => $channelId,
                    'integration_id' => $integration->id,
                ],
            ]);
        }

        Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $text,
        ]);

        $reply = $this->botReply->generate($bot, $text, $conversation);

        $whatsappText = $this->formatWhatsAppReply($reply);

        Message::create([
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $whatsappText,
            'metadata' => ! empty($reply->products) ? ['products' => $reply->products] : null,
        ]);

        $apiKey = $integration->credentials;
        if ($apiKey) {
            try {
                (new WasenderClient($apiKey))->sendText($channelId, $whatsappText);
            } catch (\Throwable $e) {
                Log::error('Wasender send failed', [
                    'integration_id' => $integration->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json(['received' => true, 'replied' => true]);
    }

    private function formatWhatsAppReply(\App\Services\BotReply $reply): string
    {
        if (empty($reply->products)) {
            return $reply->content;
        }

        $lines = [$reply->content, ''];

        foreach ($reply->products as $product) {
            $line = '• '.($product['name'] ?? 'Product');
            if (! empty($product['price'])) {
                $currency = $product['currency'] ?? 'USD';
                $line .= ' — '.$currency.' '.number_format((float) $product['price'], 2);
            }
            if (! empty($product['url'])) {
                $line .= "\n  ".$product['url'];
            }
            $lines[] = $line;
        }

        return implode("\n", $lines);
    }
}
