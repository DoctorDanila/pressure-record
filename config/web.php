<?php

declare(strict_types=1);

use core\_internal\identity\UserIdentity;
use yii\base\Module;
use yii\web\Session;

$db         = require __DIR__ . '/db.php';
$container  = __DIR__ . '/container.php';

$config = [
    'id' => $_ENV['APP_NAME'] ?? 'PRESSURE RECORD',
    'basePath' => dirname(__DIR__),
    'language' => 'ru-RU',
    'aliases' => [
        '@webroot'  => dirname(__DIR__) . '/web',
        '@core'     => dirname(__DIR__) . '/core',
    ],
    'components' => [
        'db' => $db,
        'cache' => [
            'class' => 'yii\caching\FileCache',
        ],
        'request' => [
            'cookieValidationKey' => $_ENV['COOKIE_VALIDATION_KEY'],
            'parsers' => [
                'application/json' => 'yii\web\JsonParser',
            ],
        ],
        'session' => [
            'class' => Session::class,
            'cookieParams' => [
                'httpOnly' => true,
                'secure' => ($_ENV['APP_ENV'] ?? 'dev') === 'prod',
            ],
        ],
        'user' => [
            'identityClass' => UserIdentity::class,
            'enableAutoLogin' => true,
            'loginUrl' => ['user/user/login'],
        ],
        'log' => [
            'traceLevel' => YII_DEBUG ? 1 : 0,
            'targets' => [
                [
                    'class'     => 'yii\log\FileTarget',
                    'levels'    => ['error', 'warning'],
                    'logVars'   => [],
                    'except' => [
                        'yii\web\HttpException:404',
                    ],
                ],
            ],
        ],
        'errorHandler' => [],
        'urlManager' => [
            'enablePrettyUrl' => true,
            'showScriptName' => false,
            'rules' => [
            ],
        ],
    ],
];

require $container;

return $config;
