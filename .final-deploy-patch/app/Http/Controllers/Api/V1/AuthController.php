<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use App\Models\Organization;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()],
            'organization_name' => 'required|string|max:255',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        $org = Organization::create([
            'name' => $validated['organization_name'],
            'slug' => Str::slug($validated['organization_name']),
        ]);

        $org->users()->attach($user->id, ['role' => 'owner']);

        $workspace = Workspace::create([
            'organization_id' => $org->id,
            'name' => 'Default',
            'slug' => 'default',
        ]);

        $workspace->users()->attach($user->id, ['role' => 'owner']);

        $token = $user->createToken('spa')->plainTextToken;

        return $this->success([
            'user' => $this->formatUser($user),
            'token' => $token,
        ], 'Account created', 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $credentials['email'] = strtolower(trim($credentials['email']));

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return $this->error('Invalid credentials', 422, [
                'email' => ['The email or password you entered is incorrect.'],
            ]);
        }

        $token = $user->createToken('spa')->plainTextToken;

        return $this->success([
            'user' => $this->formatUser($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return $this->success(null, 'Logged out');
    }

    public function user(Request $request): JsonResponse
    {
        return $this->success($this->formatUser($request->user()));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$request->user()->id,
        ]);

        $request->user()->update($validated);

        return $this->success($this->formatUser($request->user()->fresh()));
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return $this->success(null, 'If that email exists, a reset link has been sent.');
        }

        return $this->success(null, 'If that email exists, a reset link has been sent.');
    }

    public function organizations(Request $request): JsonResponse
    {
        $orgs = $request->user()->organizations()->get()->map(fn ($org) => [
            'id' => $org->id,
            'name' => $org->name,
            'slug' => $org->slug,
            'logo' => $org->logo,
            'created_at' => $org->created_at->toIso8601String(),
            'updated_at' => $org->updated_at->toIso8601String(),
        ]);

        return $this->success($orgs);
    }

    public function workspaces(Request $request, string $organizationId): JsonResponse
    {
        $org = $request->user()->organizations()->findOrFail($organizationId);

        $memberWorkspaceIds = $request->user()
            ->workspaces()
            ->pluck('workspaces.id');

        $workspaces = $org->workspaces()
            ->whereIn('workspaces.id', $memberWorkspaceIds)
            ->get()
            ->map(fn ($ws) => [
                'id' => $ws->id,
                'organization_id' => $ws->organization_id,
                'name' => $ws->name,
                'slug' => $ws->slug,
                'description' => $ws->description,
                'created_at' => $ws->created_at->toIso8601String(),
                'updated_at' => $ws->updated_at->toIso8601String(),
            ]);

        return $this->success($workspaces);
    }

    public function apiKeys(Request $request): JsonResponse
    {
        $keys = $request->user()->apiKeys()->get()->map(fn ($key) => [
            'id' => $key->id,
            'name' => $key->name,
            'abilities' => $key->abilities ?? [],
            'last_used_at' => $key->last_used_at?->toIso8601String(),
            'expires_at' => $key->expires_at?->toIso8601String(),
            'created_at' => $key->created_at->toIso8601String(),
        ]);

        return $this->success($keys);
    }

    public function createApiKey(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'abilities' => 'required|array',
            'expires_at' => 'nullable|date',
        ]);

        $plainToken = 'pt_'.Str::random(48);

        $apiKey = $request->user()->apiKeys()->create([
            'name' => $validated['name'],
            'token_hash' => hash('sha256', $plainToken),
            'abilities' => $validated['abilities'],
            'expires_at' => $validated['expires_at'] ?? null,
        ]);

        return $this->success([
            'api_key' => [
                'id' => $apiKey->id,
                'name' => $apiKey->name,
                'abilities' => $apiKey->abilities,
                'last_used_at' => null,
                'expires_at' => $apiKey->expires_at?->toIso8601String(),
                'created_at' => $apiKey->created_at->toIso8601String(),
            ],
            'plain_text_token' => $plainToken,
        ], 'API key created', 201);
    }

    public function deleteApiKey(Request $request, string $id): JsonResponse
    {
        $request->user()->apiKeys()->where('id', $id)->delete();

        return $this->success(null, 'API key deleted');
    }

    public function sessions(Request $request): JsonResponse
    {
        $currentId = $request->session()->getId();

        $sessions = collect(\DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->get())
            ->map(fn ($s) => [
                'id' => $s->id,
                'ip_address' => $s->ip_address,
                'user_agent' => $s->user_agent,
                'last_active' => now()->createFromTimestamp($s->last_activity)->toIso8601String(),
                'is_current' => $s->id === $currentId,
            ]);

        return $this->success($sessions);
    }

    public function revokeSession(Request $request, string $id): JsonResponse
    {
        \DB::table('sessions')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return $this->success(null, 'Session revoked');
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'avatar' => $user->avatar,
            'created_at' => $user->created_at->toIso8601String(),
            'updated_at' => $user->updated_at->toIso8601String(),
        ];
    }
}
