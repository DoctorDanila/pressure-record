<?php

declare(strict_types=1);

use yii\console\controllers\MigrateController;

return [
    'id' => 'pressure-record-console',
    'basePath' => dirname(__DIR__),
    'controllerNamespace' => 'app\\commands',
    'aliases' => [
        '@webroot'  => dirname(__DIR__) . '/web',
        '@core'     => dirname(__DIR__) . '/core',
    ],
    'controllerMap' => [
        'migrate' => [
            'class' => MigrateController::class,
            'migrationPath' => null,
            'migrationNamespaces' => [
                'core\\user\\infrastructure\\migrations',
                'core\\record\\infrastructure\\migrations',
            ],
        ],
    ],
    'components' => [
        'db' => require __DIR__ . '/db.php',
    ],
];
