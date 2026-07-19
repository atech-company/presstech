<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\AuthorizesWorkspace;
use App\Http\Controllers\Controller;
use App\Models\Integration;
use App\Services\Integrations\IntegrationTester;
use App\Services\Integrations\WhatsappIntegrationService;
use App\Services\WhatsApp\WasenderClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class IntegrationController extends Controller
{
    use AuthorizesWorkspace;

    private const CATALOG = [
        ['type' => 'whatsapp', 'name' => 'WhatsApp (Wasender)', 'category' => 'messaging', 'description' => 'Connect WhatsApp via Wasender API — receive and reply to messages'],
        ['type' => 'website', 'name' => 'Website Chat', 'category' => 'messaging', 'description' => 'Embed a chat widget on your website — same bot, same knowledge'],
        ['type' => 'telegram', 'name' => 'Telegram', 'category' => 'messaging', 'description' => 'Connect a Telegram bot'],
        ['type' => 'slack', 'name' => 'Slack', 'category' => 'messaging', 'description' => 'Post messages to Slack channels'],
        ['type' => 'discord', 'name' => 'Discord', 'category' => 'messaging', 'description' => 'Connect a Discord bot'],
        ['type' => 'webhook', 'name' => 'Webhook', 'category' => 'api', 'description' => 'Receive events via HTTP webhooks'],
        ['type' => 'rest_api', 'name' => 'REST API', 'category' => 'api', 'description' => 'Call external REST APIs'],
    ];

    public function catalog(): JsonResponse
    {
        return $this->success(self::CATALOG);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Integration::query();
        $this->scopeToUserWorkspaces($request, $query);

        if ($wsId = $request->query('workspace_id')) {
            $this->authorizeWorkspace($request, $wsId);
            $query->where('workspace_id', $wsId);
        }

        $integrations = $query->latest()->get()->map(fn ($i) => $this->formatIntegration($i));

        return $this->success($integrations);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'workspace_id' => 'required|uuid|exists:workspaces,id',
            'type' => 'required|string',
            'name' => 'required|string|max:255',
            'config' => 'nullable|array',
            'config.bot_id' => 'nullable|uuid|exists:bots,id',
            'config.personal_access_token' => 'nullable|string',
            'config.wasender_session_id' => 'nullable|string',
            'config.url' => 'nullable|url',
            'credentials' => 'nullable|string',
        ]);

        $this->authorizeWorkspace($request, $validated['workspace_id']);

        if ($validated['type'] === 'website' && empty($validated['config']['bot_id'] ?? null)) {
            return $this->error('Select a bot for the website chat widget', 422);
        }

        $config = $validated['config'] ?? [];

        if ($validated['type'] === 'website') {
            $config['embed_token'] = Str::random(48);
        }

        $integration = Integration::create([
            'workspace_id' => $validated['workspace_id'],
            'type' => $validated['type'],
            'name' => $validated['name'],
            'status' => 'active',
            'config' => $config,
            'credentials' => $validated['credentials'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        return $this->success($this->formatIntegration($integration, true), 'Integration connected', 201);
    }

    public function show(Request $request, Integration $integration): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $integration);

        return $this->success($this->formatIntegration($integration, true));
    }

    public function update(Request $request, Integration $integration): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $integration);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:active,inactive,error',
            'config' => 'nullable|array',
            'config.bot_id' => 'nullable|uuid|exists:bots,id',
            'config.personal_access_token' => 'nullable|string',
            'config.wasender_session_id' => 'nullable|string',
            'config.url' => 'nullable|url',
            'credentials' => 'nullable|string',
        ]);

        if (isset($validated['config'])) {
            $incoming = $validated['config'];
            if (empty($incoming['personal_access_token'])) {
                unset($incoming['personal_access_token']);
            }
            $validated['config'] = array_merge($integration->config ?? [], $incoming);
        }

        if (array_key_exists('credentials', $validated) && $validated['credentials'] === '') {
            unset($validated['credentials']);
        }

        $integration->update($validated);

        return $this->success($this->formatIntegration($integration->fresh()));
    }

    public function destroy(Request $request, Integration $integration): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $integration);
        $integration->delete();

        return $this->success(null, 'Integration disconnected');
    }

    public function test(Request $request, Integration $integration): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $integration);

        $result = app(IntegrationTester::class)->test($integration);

        return $this->success($result);
    }

    public function whatsappSetup(Request $request, Integration $integration): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $integration);

        if ($integration->type !== 'whatsapp') {
            return $this->error('This integration is not WhatsApp', 422);
        }

        $request->validate([
            'personal_access_token' => 'nullable|string',
            'wasender_session_id' => 'nullable|string',
            'bot_id' => 'nullable|uuid|exists:bots,id',
            'phone_number' => 'nullable|string|max:32',
            'session_name' => 'nullable|string|max:120',
        ]);

        try {
            $result = app(WhatsappIntegrationService::class)->setup($integration, $request);

            return $this->success($result, 'Scan the QR code with WhatsApp on your phone (Linked Devices)');
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function whatsappSync(Request $request, Integration $integration): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $integration);

        if ($integration->type !== 'whatsapp') {
            return $this->error('This integration is not WhatsApp', 422);
        }

        try {
            $result = app(WhatsappIntegrationService::class)->sync($integration);

            return $this->success($result);
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function whatsappConnect(Request $request, Integration $integration): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $integration);

        if ($integration->type !== 'whatsapp') {
            return $this->error('This integration is not WhatsApp', 422);
        }

        $request->validate([
            'personal_access_token' => 'nullable|string',
            'wasender_session_id' => 'nullable|string',
        ]);

        try {
            [$pat, $sessionId] = $this->resolveWhatsappPatAndSession($request, $integration);
            $result = WasenderClient::connectSession($pat, $sessionId);

            return $this->success($result, 'Connection initiated — fetch QR code next');
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function whatsappSessions(Request $request, Integration $integration): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $integration);

        if ($integration->type !== 'whatsapp') {
            return $this->error('This integration is not WhatsApp', 422);
        }

        $request->validate([
            'personal_access_token' => 'nullable|string',
        ]);

        try {
            $pat = trim((string) ($request->input('personal_access_token')
                ?? $integration->config['personal_access_token']
                ?? ''));

            if ($pat === '') {
                throw new \InvalidArgumentException('Personal Access Token is required to list sessions');
            }

            $result = WasenderClient::listSessions($pat);
            $sessions = $result['data'] ?? $result;

            return $this->success(is_array($sessions) ? $sessions : []);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function whatsappQrCode(Request $request, Integration $integration): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $integration);

        if ($integration->type !== 'whatsapp') {
            return $this->error('This integration is not WhatsApp', 422);
        }

        $request->validate([
            'personal_access_token' => 'nullable|string',
            'wasender_session_id' => 'nullable|string',
        ]);

        try {
            [$pat, $sessionId] = $this->resolveWhatsappPatAndSession($request, $integration);
            $result = WasenderClient::getQrCode($pat, $sessionId);
            $data = $result['data'] ?? $result;
            $qrcode = is_array($data)
                ? ($data['qrcode'] ?? $data['qr'] ?? $data['qr_code'] ?? null)
                : $data;

            return $this->success([
                'qrcode' => $qrcode,
                'session_id' => $sessionId,
            ]);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    public function whatsappStatus(Request $request, Integration $integration): JsonResponse
    {
        $this->authorizeWorkspaceResource($request, $integration);

        if ($integration->type !== 'whatsapp') {
            return $this->error('This integration is not WhatsApp', 422);
        }

        $status = ['connected' => false, 'session_api' => null, 'session' => null];

        if ($integration->credentials) {
            try {
                $apiStatus = (new WasenderClient($integration->credentials))->sessionStatus();
                $status['session_api'] = $apiStatus['data'] ?? $apiStatus;
                $state = strtolower((string) ($status['session_api']['status'] ?? $status['session_api']['state'] ?? ''));
                $status['connected'] = in_array($state, ['connected', 'open', 'ready', 'authenticated'], true);
            } catch (\Throwable $e) {
                $status['session_api'] = ['error' => $e->getMessage()];
            }
        }

        $pat = $integration->config['personal_access_token'] ?? null;
        $sessionId = $integration->config['wasender_session_id'] ?? null;

        if ($pat && $sessionId) {
            try {
                $session = WasenderClient::getSession($pat, $sessionId);
                $sessionData = $session['data'] ?? $session;
                $status['session'] = $sessionData;
                $state = strtolower((string) ($sessionData['status'] ?? $sessionData['state'] ?? ''));
                if (in_array($state, ['connected', 'open', 'ready', 'authenticated'], true)) {
                    $status['connected'] = true;
                }
            } catch (\Throwable $e) {
                $status['session'] = ['error' => $e->getMessage()];
            }
        }

        try {
            $service = app(WhatsappIntegrationService::class);
            $sync = $service->sync($integration);

            return $this->success(array_merge($status, $sync));
        } catch (\Throwable $e) {
            return $this->success($status);
        }
    }

    private function resolveWhatsappPatAndSession(Request $request, Integration $integration): array
    {
        $incomingPat = trim((string) ($request->input('personal_access_token') ?? ''));
        $incomingSessionId = trim((string) ($request->input('wasender_session_id') ?? ''));

        $config = $integration->config ?? [];
        $pat = $incomingPat !== '' ? $incomingPat : ($config['personal_access_token'] ?? null);
        $sessionId = $incomingSessionId !== '' ? $incomingSessionId : ($config['wasender_session_id'] ?? null);

        if ($incomingPat !== '' || $incomingSessionId !== '') {
            $merged = array_merge($config, array_filter([
                'personal_access_token' => $incomingPat !== '' ? $incomingPat : null,
                'wasender_session_id' => $incomingSessionId !== '' ? $incomingSessionId : null,
            ], fn ($v) => $v !== null));

            $integration->update(['config' => $merged]);
            $integration->refresh();

            $pat = $merged['personal_access_token'] ?? $pat;
            $sessionId = $merged['wasender_session_id'] ?? $sessionId;
        }

        if (! $pat || ! $sessionId) {
            throw new \InvalidArgumentException(
                'Personal Access Token and Wasender Session ID are required. Get PAT from Wasender → Settings → Personal Access Token. Session ID is the numeric ID from your sessions list (not the session API key).'
            );
        }

        if (! ctype_digit((string) $sessionId)) {
            throw new \InvalidArgumentException(
                'Wasender Session ID must be a numeric ID (e.g. 12345). Find it in Wasender → Sessions, or click Load Sessions after entering your PAT.'
            );
        }

        return [$pat, $sessionId];
    }

    private function whatsappPatAndSession(Integration $integration): array
    {
        $pat = $integration->config['personal_access_token'] ?? null;
        $sessionId = $integration->config['wasender_session_id'] ?? null;

        if (! $pat || ! $sessionId) {
            throw new \InvalidArgumentException('Personal Access Token and Wasender Session ID are required for QR linking');
        }

        return [$pat, $sessionId];
    }

    private function formatIntegration(Integration $integration, bool $includeSecrets = false): array
    {
        $config = $integration->config ?? [];

        if (isset($config['personal_access_token'])) {
            $config['personal_access_token_set'] = true;
            if (! $includeSecrets) {
                unset($config['personal_access_token']);
            }
        }

        if (isset($config['embed_token'])) {
            $config['embed_token_set'] = true;
            if (! $includeSecrets) {
                unset($config['embed_token']);
            }
        }

        $data = [
            'id' => $integration->id,
            'workspace_id' => $integration->workspace_id,
            'type' => $integration->type,
            'name' => $integration->name,
            'status' => $integration->status,
            'config' => $config,
            'has_credentials' => ! empty($integration->getAttributes()['credentials'] ?? null),
            'webhook_url' => $integration->type === 'whatsapp'
                ? rtrim(config('app.url'), '/').'/api/v1/webhooks/'.$integration->id
                : null,
            'created_at' => $integration->created_at->toIso8601String(),
            'updated_at' => $integration->updated_at->toIso8601String(),
        ];

        if ($integration->type === 'website' && $includeSecrets) {
            $data['embed_code'] = $this->buildEmbedCode($integration);
            $data['embed_url'] = $this->buildEmbedUrl($integration);
        }

        return $data;
    }

    private function buildEmbedUrl(Integration $integration): ?string
    {
        $botId = $integration->config['bot_id'] ?? null;
        $token = $integration->config['embed_token'] ?? null;

        if (! $botId || ! $token) {
            return null;
        }

        $frontend = rtrim(env('FRONTEND_URL', 'https://presstech.vercel.app'), '/');

        return "{$frontend}/embed/{$botId}?token={$token}";
    }

    private function buildEmbedCode(Integration $integration): ?string
    {
        $botId = $integration->config['bot_id'] ?? null;
        $token = $integration->config['embed_token'] ?? null;

        if (! $botId || ! $token) {
            return null;
        }

        $frontend = rtrim(env('FRONTEND_URL', 'https://presstech.vercel.app'), '/');

        return '<script src="'.$frontend.'/widget.js" data-bot="'.$botId.'" data-token="'.$token.'" defer></script>';
    }
}
