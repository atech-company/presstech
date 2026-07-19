<?php

return [
    'default' => env('AI_DEFAULT_PROVIDER', 'openrouter'),

    'providers' => [
        'deepseek' => [
            'api_key' => env('DEEPSEEK_API_KEY'),
            'model' => env('DEEPSEEK_MODEL', 'deepseek-chat'),
            'base_url' => env('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
            'label' => 'DeepSeek',
            'models' => [
                'deepseek-chat' => 'DeepSeek Chat (fast, V3)',
                'deepseek-reasoner' => 'DeepSeek Reasoner (R1, most capable)',
            ],
        ],
        'openrouter' => [
            'api_key' => env('OPENROUTER_API_KEY'),
            'model' => env('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
            'base_url' => env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
            'label' => 'OpenRouter',
            'models' => [
                'openai/gpt-4o-mini' => 'GPT-4o Mini',
                'openai/gpt-4o' => 'GPT-4o',
                'anthropic/claude-3.5-sonnet' => 'Claude 3.5 Sonnet',
            ],
        ],
        'openai' => [
            'api_key' => env('OPENAI_API_KEY'),
            'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
            'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
            'label' => 'OpenAI',
            'models' => [
                'gpt-4o-mini' => 'GPT-4o Mini',
                'gpt-4o' => 'GPT-4o',
            ],
        ],
    ],
];
