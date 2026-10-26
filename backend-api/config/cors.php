<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:5173'),
        // Local Vite can also run on port 5713; allow it so requests are not rejected.
        'http://localhost:5713',
        'http://127.0.0.1:5713',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 7200,

    'supports_credentials' => false,
];
