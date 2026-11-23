<?php

declare(strict_types=1);

use yii\console\controllers\MigrateController;

return [
    'id' => 'pressure-record-console',
    'basePath' => dirname(__DIR__),
    'controllerNamespace' => 'app\commands',
    'controllerMap' => [
        'migrate' => [
            'class' => MigrateController::class,
            'migrationPath' => null,
            'migrationNamespaces' => [
            ],
        ],
    ],
    'components' => [
        'db' => require __DIR__ . '/db.php',
    ],
];
