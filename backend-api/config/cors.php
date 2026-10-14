<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Local Vite can run on a project-specific port. Keep the development
    // origins explicit so browser requests are not rejected as a network
    // error when the frontend is served on 5713.
    'allowed_origins' => [
        env('FRONTEND_URL', 'http://localhost:5713'),
        'http://127.0.0.1:5713',
        'http://localhost:5713',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
