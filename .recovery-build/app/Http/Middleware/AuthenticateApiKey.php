<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            return $next($request);
        }

        $token = $request->bearerToken();

        if (! $token || ! str_starts_with($token, 'pt_')) {
            return $next($request);
        }

        $hash = hash('sha256', $token);
        $apiKey = ApiKey::where('token_hash', $hash)->first();

        if (! $apiKey || ($apiKey->expires_at && $apiKey->expires_at->isPast())) {
            return response()->json(['message' => 'Invalid API key'], 401);
        }

        $apiKey->update(['last_used_at' => now()]);
        Auth::login($apiKey->user);

        return $next($request);
    }
}
