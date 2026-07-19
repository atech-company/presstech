<?php

namespace App\Services\Integrations;

use App\Models\Integration;
use App\Services\WhatsApp\WasenderClient;
use Illuminate\Support\Facades\Http;

class IntegrationTester
{
    public function test(Integration $integration): array
    {
        return match ($integration->type) {
            'whatsapp' => $this->testWhatsApp($integration),
            'webhook' => $this->testWebhook($integration),
            default => $this->testGeneric($integration),
        };
    }

    private function testWhatsApp(Integration $integration): array
    {
        $config = $integration->config ?? [];
        $sessionKey = $integration->credentials;
        $pat = $config['personal_access_token'] ?? null;
        $sessionId = $config['wasender_session_id'] ?? null;
        $results = [];

        if ($sessionKey) {
            try {
                $status = (new WasenderClient($sessionKey))->sessionStatus();
                $results['session_api'] = [
                    'ok' => true,
                    'message' => 'Session API key is valid',
                    'status' => $status['data'] ?? $status,
                ];
            } catch (\Throwable $e) {
                $results['session_api'] = [
                    'ok' => false,
                    'message' => $e->getMessage(),
                ];
            }
        } else {
            $results['session_api'] = [
                'ok' => false,
                'message' => 'No session API key saved',
            ];
        }

        if ($pat && $sessionId) {
            try {
                $session = WasenderClient::getSession($pat, $sessionId);
                $results['personal_access_token'] = [
                    'ok' => true,
                    'message' => 'Personal access token is valid',
                    'session' => $session['data'] ?? $session,
                ];
            } catch (\Throwable $e) {
                $results['personal_access_token'] = [
                    'ok' => false,
                    'message' => $e->getMessage(),
                ];
            }
        } else {
            $results['personal_access_token'] = [
                'ok' => false,
                'message' => 'Add Personal Access Token + Session ID for QR linking',
            ];
        }

        $webhookUrl = rtrim(config('app.url'), '/').'/api/v1/webhooks/'.$integration->id;
        $results['webhook_url'] = [
            'ok' => true,
            'message' => 'Set this URL in Wasender session webhook settings',
            'url' => $webhookUrl,
        ];

        $ok = ($results['session_api']['ok'] ?? false) || ($results['personal_access_token']['ok'] ?? false);

        return [
            'ok' => $ok,
            'type' => 'whatsapp',
            'checks' => $results,
        ];
    }

    private function testWebhook(Integration $integration): array
    {
        $url = $integration->config['url'] ?? null;

        if (! $url) {
            return [
                'ok' => false,
                'type' => 'webhook',
                'message' => 'No webhook URL configured in integration settings',
            ];
        }

        try {
            $response = Http::timeout(10)->post($url, [
                'event' => 'presstech.test',
                'integration_id' => $integration->id,
            ]);

            return [
                'ok' => $response->successful(),
                'type' => 'webhook',
                'message' => $response->successful()
                    ? "Webhook responded with HTTP {$response->status()}"
                    : "Webhook returned HTTP {$response->status()}",
                'status_code' => $response->status(),
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'type' => 'webhook',
                'message' => $e->getMessage(),
            ];
        }
    }

    private function testGeneric(Integration $integration): array
    {
        $hasCredentials = ! empty($integration->credentials);

        return [
            'ok' => $hasCredentials,
            'type' => $integration->type,
            'message' => $hasCredentials
                ? 'Credentials are stored'
                : 'No credentials configured',
        ];
    }
}
