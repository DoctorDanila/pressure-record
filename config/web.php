<?php

declare(strict_types=1);

use core\_internal\identity\UserIdentity;
use core\user\presentation\middleware\AuthMiddleware;
use yii\base\Module;
use yii\symfonymailer\Mailer;
use yii\web\Session;

$db         = require __DIR__ . '/db.php';
$container  = __DIR__ . '/container.php';

$config = [
    'id' => $_ENV['APP_NAME'] ?? 'PRESSURE RECORD',
    'basePath' => dirname(__DIR__),
    'language' => 'ru-RU',
    'timeZone' => 'Europe/Moscow',
    'aliases' => [
        '@webroot'  => dirname(__DIR__) . '/web',
        '@core'     => dirname(__DIR__) . '/core',
    ],
    'on beforeRequest' => static function (): void {
        Yii::$container->get(AuthMiddleware::class)->handle();
    },
    'modules' => [
        'user' => [
            'class' => Module::class,
            'controllerNamespace' => 'core\user\presentation\controller',
        ],
        'record' => [
            'class' => Module::class,
            'controllerNamespace' => 'core\record\presentation\controller',
        ],
        'setting' => [
            'class' => Module::class,
            'controllerNamespace' => 'core\setting\presentation\controller',
        ],
    ],
    'components' => [
        'db' => $db,
        'cache' => [
            'class' => 'yii\caching\FileCache',
        ],
        'request' => [
            'scriptUrl' => '/index.php',
            'cookieValidationKey' => $_ENV['COOKIE_VALIDATION_KEY'],
            'parsers' => [
                'application/json' => 'yii\web\JsonParser',
            ],
        ],
        'session' => [
            'class' => Session::class,
            'cookieParams' => [
                'httpOnly'  => true,
                'secure'    => ($_ENV['APP_ENV'] ?? 'dev') === 'prod',
            ],
        ],
        'user' => [
            'identityClass' => UserIdentity::class,
            'enableAutoLogin' => true,
            'loginUrl' => ['user/user/login'],
        ],
        'mailer' => [
            'class'             => Mailer::class,
            'viewPath'          => '@app/mail',
            'useFileTransport'  => false,
            'transport'         => [
                'scheme'        => $_ENV['MAILER_SCHEME'],
                'host'          => $_ENV['MAILER_HOST'],
                'port'          => $_ENV['MAILER_PORT'],
                'username'      => $_ENV['MAILER_USERNAME'],
                'password'      => $_ENV['MAILER_PASSWORD'],
                'encryption'    => $_ENV['MAILER_ENCRYPTION'],
                'options' => [
                    'verify_peer'       => 0,
                    'verify_peer_name'  => 0,
                ],
            ],
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
                // Public SPA paths are served by Apache from /dist; API paths enter Yii
                'api/auth/register'            => 'user/user/register',
                'api/auth/login'                    => 'user/user/login',
                'api/auth/logout'                   => 'user/user/logout',
                'api/auth/me'                       => 'user/user/profile',
                'api/auth/verify-email'             => 'user/user/verify-email',

                'api/settings'                      => 'setting/setting/index',
                'api/settings/update'               => 'setting/setting/update',
                'api/devices/create'                => 'setting/setting/create-device',
                'api/devices/<id:\d+>/delete'       => 'setting/setting/delete-device',

                'api/records/dashboard'             => 'record/record/dashboard',
                'api/records/export.csv'            => 'record/record/export',
                'api/records/export.pdf'            => 'record/record/export-pdf',
                'api/records/create'                => 'record/record/create',
                'api/records/<id:\d+>/delete'       => 'record/record/delete',
                'api/records/<id:\d+>'              => 'record/record/view',
                'api/records'                       => 'record/record/index',
            ],
        ],
    ],
];

require $container;

return $config;
