<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Http;

class WasenderClient
{
    private const BASE = 'https://www.wasenderapi.com/api';

    private const WEBHOOK_EVENTS = [
        'messages.received',
        'messages.upsert',
        'session.status',
    ];

    public function __construct(private readonly string $apiKey) {}

    public function sendText(string $to, string $text): array
    {
        $to = preg_replace('/\D+/', '', $to) ?? $to;

        return $this->request('post', '/send-message', [
            'to' => $to,
            'text' => $text,
        ]);
    }

    public function sessionStatus(): array
    {
        return $this->request('get', '/status');
    }

    public static function listSessions(string $personalAccessToken): array
    {
        return self::patRequest('get', '/whatsapp-sessions', $personalAccessToken);
    }

    public static function createSession(string $personalAccessToken, array $payload): array
    {
        return self::patRequest('post', '/whatsapp-sessions', $personalAccessToken, $payload);
    }

    public static function connectSession(string $personalAccessToken, int|string $sessionId): array
    {
        return self::patRequest(
            'post',
            '/whatsapp-sessions/'.urlencode((string) $sessionId).'/connect',
            $personalAccessToken,
            ['linkMethod' => 'qr']
        );
    }

    public static function getQrCode(string $personalAccessToken, int|string $sessionId): array
    {
        return self::patRequest(
            'get',
            '/whatsapp-sessions/'.urlencode((string) $sessionId).'/qrcode',
            $personalAccessToken
        );
    }

    public static function getSession(string $personalAccessToken, int|string $sessionId): array
    {
        return self::patRequest(
            'get',
            '/whatsapp-sessions/'.urlencode((string) $sessionId),
            $personalAccessToken
        );
    }

    public static function updateSession(string $personalAccessToken, int|string $sessionId, array $payload): array
    {
        return self::patRequest(
            'put',
            '/whatsapp-sessions/'.urlencode((string) $sessionId),
            $personalAccessToken,
            $payload
        );
    }

    public static function webhookPayload(string $webhookUrl): array
    {
        return [
            'webhook_url' => $webhookUrl,
            'webhook_enabled' => true,
            'webhook_events' => self::WEBHOOK_EVENTS,
        ];
    }

    public static function extractSessionData(array $response): array
    {
        return is_array($response['data'] ?? null) ? $response['data'] : $response;
    }

    public static function extractQrCode(array $response): ?string
    {
        $data = self::extractSessionData($response);
        if (is_string($data)) {
            return $data;
        }

        return $data['qrcode'] ?? $data['qr'] ?? $data['qr_code'] ?? null;
    }

    public static function isConnectedStatus(?string $status): bool
    {
        $state = strtolower((string) $status);

        return in_array($state, ['connected', 'open', 'ready', 'authenticated'], true);
    }

    private function request(string $method, string $path, array $data = []): array
    {
        $response = Http::withToken($this->apiKey)
            ->acceptJson()
            ->timeout(30)
            ->{$method}(self::BASE.$path, $data);

        if ($response->failed()) {
            throw new \RuntimeException(self::parseError($response), $response->status());
        }

        return $response->json() ?? [];
    }

    private static function patRequest(string $method, string $path, string $pat, array $data = []): array
    {
        $request = Http::withToken($pat)
            ->acceptJson()
            ->asJson()
            ->timeout(30);

        $response = match ($method) {
            'get' => $request->get(self::BASE.$path),
            'put' => $request->put(self::BASE.$path, $data),
            default => $request->{$method}(self::BASE.$path, $data),
        };

        if ($response->failed()) {
            throw new \RuntimeException(self::parseError($response), $response->status());
        }

        return $response->json() ?? [];
    }

    private static function parseError(\Illuminate\Http\Client\Response $response): string
    {
        $json = $response->json();

        if (is_array($json)) {
            if (! empty($json['message']) && is_string($json['message'])) {
                return $json['message'];
            }

            if (! empty($json['error']) && is_string($json['error'])) {
                return $json['error'];
            }

            if (! empty($json['errors']) && is_array($json['errors'])) {
                $messages = [];
                foreach ($json['errors'] as $key => $value) {
                    if (is_array($value)) {
                        $messages[] = $key.': '.implode(', ', $value);
                    } elseif (is_string($value)) {
                        $messages[] = $value;
                    }
                }
                if ($messages !== []) {
                    return implode('; ', $messages);
                }
            }
        }

        $body = trim($response->body());

        return $body !== '' ? $body : 'Wasender API request failed (HTTP '.$response->status().')';
    }
}
