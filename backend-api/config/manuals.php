<?php

return [
    'version' => '1.0',
    'directory' => public_path('manuals'),
    'max_bytes' => 15 * 1024 * 1024,
    'languages' => [
        'en' => ['label' => 'English', 'file' => 'VMS_User_Manual_English.pdf'],
        'ceb' => ['label' => 'Bisaya (Cebuano)', 'file' => 'VMS_User_Manual_Bisaya.pdf'],
        'fil' => ['label' => 'Tagalog (Filipino)', 'file' => 'VMS_User_Manual_Tagalog.pdf'],
    ],
];
