<?php

namespace App\Services\Integrations;

use App\Models\Integration;
use App\Services\WhatsApp\WasenderClient;
use Illuminate\Http\Request;

class WhatsappIntegrationService
{
    public function webhookUrl(Integration $integration): string
    {
        return rtrim(config('app.url'), '/').'/api/v1/webhooks/'.$integration->id;
    }

    public function setup(Integration $integration, Request $request): array
    {
        [$pat, $sessionId] = $this->resolveCredentials($request, $integration, requireSession: false);
        $phoneNumber = $this->normalizePhone($request->input('phone_number'));
        $sessionName = trim((string) ($request->input('session_name') ?? ''));

        $this->persistConfig($integration, $request, $pat, $sessionId, $phoneNumber);

        $webhookUrl = $this->webhookUrl($integration);

        if (! $sessionId && $phoneNumber) {
            $sessionId = $this->resolveOrCreateSessionId($pat, $phoneNumber, $sessionName, $webhookUrl);
            $this->persistConfig($integration, $request, $pat, $sessionId, $phoneNumber);
        }

        if (! $sessionId) {
            $sessionId = $this->pickDefaultSessionId($pat);
            $this->persistConfig($integration, $request, $pat, $sessionId, $phoneNumber);
        }

        WasenderClient::updateSession($pat, $sessionId, WasenderClient::webhookPayload($webhookUrl));

        try {
            WasenderClient::connectSession($pat, $sessionId);
        } catch (\Throwable $e) {
            // Session may already be in connecting state — still try QR.
        }

        $qrResponse = WasenderClient::getQrCode($pat, $sessionId);
        $sync = $this->sync($integration->fresh(), $pat, $sessionId);

        return [
            'session_id' => $sessionId,
            'phone_number' => $phoneNumber,
            'qrcode' => WasenderClient::extractQrCode($qrResponse),
            'webhook_url' => $webhookUrl,
            'webhook_configured' => true,
            ...$sync,
        ];
    }

    public function sync(Integration $integration, ?string $pat = null, ?string $sessionId = null): array
    {
        $config = $integration->config ?? [];
        $pat ??= $config['personal_access_token'] ?? null;
        $sessionId ??= $config['wasender_session_id'] ?? null;

        if (! $pat || ! $sessionId) {
            return [
                'connected' => false,
                'credentials_saved' => ! empty($integration->credentials),
                'webhook_configured' => false,
                'session_status' => null,
            ];
        }

        $session = WasenderClient::getSession($pat, $sessionId);
        $data = WasenderClient::extractSessionData($session);
        $status = (string) ($data['status'] ?? '');
        $connected = WasenderClient::isConnectedStatus($status);
        $apiKey = $data['api_key'] ?? null;

        if ($apiKey) {
            $integration->update(['credentials' => $apiKey]);
            $integration->refresh();
        }

        $webhookUrl = $this->webhookUrl($integration);
        $webhookConfigured = ($data['webhook_url'] ?? '') === $webhookUrl
            && ($data['webhook_enabled'] ?? false) === true;

        if ($connected && ! $webhookConfigured) {
            try {
                WasenderClient::updateSession($pat, $sessionId, WasenderClient::webhookPayload($webhookUrl));
                $webhookConfigured = true;
            } catch (\Throwable) {
                // keep going — credentials may still be valid
            }
        }

        return [
            'connected' => $connected,
            'credentials_saved' => ! empty($integration->credentials),
            'webhook_configured' => $webhookConfigured,
            'session_status' => $status,
            'webhook_url' => $webhookUrl,
        ];
    }

    public function listSessions(Integration $integration, ?string $pat = null): array
    {
        $pat ??= $integration->config['personal_access_token'] ?? null;

        if (! $pat) {
            throw new \InvalidArgumentException('Wasender Personal Access Token is required');
        }

        $result = WasenderClient::listSessions($pat);
        $sessions = $result['data'] ?? $result;

        return is_array($sessions) ? $sessions : [];
    }

    private function resolveOrCreateSessionId(
        string $pat,
        string $phoneNumber,
        string $sessionName,
        string $webhookUrl
    ): string {
        $existing = $this->findSessionIdByPhone($pat, $phoneNumber);
        if ($existing !== null) {
            return $existing;
        }

        $name = $sessionName !== '' ? $sessionName : 'PressTech '.$phoneNumber;

        $response = WasenderClient::createSession($pat, array_merge([
            'name' => $name,
            'phone_number' => $phoneNumber,
            'account_protection' => true,
            'log_messages' => true,
        ], WasenderClient::webhookPayload($webhookUrl)));

        $data = WasenderClient::extractSessionData($response);
        $sessionId = (string) ($data['id'] ?? $response['id'] ?? '');

        if ($sessionId === '' || ! ctype_digit($sessionId)) {
            throw new \InvalidArgumentException(
                'Wasender created a session but did not return a valid session ID. Check your Wasender account.'
            );
        }

        return $sessionId;
    }

    private function findSessionIdByPhone(string $pat, string $phoneNumber): ?string
    {
        foreach ($this->listSessionsFromPat($pat) as $session) {
            if (! is_array($session)) {
                continue;
            }

            try {
                $sessionPhone = $this->normalizePhone($session['phone_number'] ?? $session['phone'] ?? null);
            } catch (\InvalidArgumentException) {
                continue;
            }

            if ($sessionPhone !== null && $sessionPhone === $phoneNumber) {
                $sessionId = (string) ($session['id'] ?? '');
                if ($sessionId !== '' && ctype_digit($sessionId)) {
                    return $sessionId;
                }
            }
        }

        return null;
    }

    private function normalizePhone(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', (string) $value) ?? '';

        if ($digits === '') {
            return null;
        }

        if (strlen($digits) < 8 || strlen($digits) > 15) {
            throw new \InvalidArgumentException(
                'Phone number must be international format with 8–15 digits (e.g. 96170123456).'
            );
        }

        return $digits;
    }

    private function pickDefaultSessionId(string $pat): string
    {
        $sessions = $this->listSessionsFromPat($pat);

        if ($sessions === []) {
            throw new \InvalidArgumentException(
                'No Wasender sessions found. Enter a phone number to register one, or create a session at wasenderapi.com → Sessions.'
            );
        }

        $sessionId = (string) ($sessions[0]['id'] ?? '');

        if ($sessionId === '' || ! ctype_digit($sessionId)) {
            throw new \InvalidArgumentException('Could not determine a valid Wasender session ID');
        }

        return $sessionId;
    }

    private function listSessionsFromPat(string $pat): array
    {
        $result = WasenderClient::listSessions($pat);
        $sessions = $result['data'] ?? $result;

        return is_array($sessions) ? $sessions : [];
    }

    private function persistConfig(
        Integration $integration,
        Request $request,
        string $pat,
        ?string $sessionId,
        ?string $phoneNumber = null
    ): void {
        $config = array_merge($integration->config ?? [], [
            'personal_access_token' => $pat,
        ]);

        if ($sessionId) {
            $config['wasender_session_id'] = $sessionId;
        }

        if ($phoneNumber) {
            $config['phone_number'] = $phoneNumber;
        }

        if ($request->filled('session_name')) {
            $config['session_name'] = trim((string) $request->input('session_name'));
        }

        if ($request->filled('bot_id')) {
            $config['bot_id'] = $request->input('bot_id');
        }

        $integration->update(['config' => $config]);
        $integration->refresh();
    }

    private function resolveCredentials(Request $request, Integration $integration, bool $requireSession = true): array
    {
        $incomingPat = trim((string) ($request->input('personal_access_token') ?? ''));
        $incomingSessionId = trim((string) ($request->input('wasender_session_id') ?? ''));
        $config = $integration->config ?? [];

        $pat = $incomingPat !== '' ? $incomingPat : ($config['personal_access_token'] ?? null);
        $sessionId = $incomingSessionId !== '' ? $incomingSessionId : ($config['wasender_session_id'] ?? null);

        if (! $pat) {
            throw new \InvalidArgumentException(
                'Enter your Wasender Personal Access Token once (Wasender → Settings → Personal Access Token).'
            );
        }

        if ($requireSession && ! $sessionId) {
            throw new \InvalidArgumentException('Select a Wasender session.');
        }

        if ($sessionId && ! ctype_digit((string) $sessionId)) {
            throw new \InvalidArgumentException('Wasender Session ID must be a number.');
        }

        return [$pat, $sessionId ?: null];
    }
}
