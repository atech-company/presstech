<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique(array_filter(array_merge(
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')),
        array_filter([
            env('FRONTEND_URL'),
            'https://presstech.vercel.app',
            'http://localhost:3000',
        ])
    )))),

    'allowed_origins_patterns' => [
        '#^https://[\w-]+\.vercel\.app$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => true,

];
