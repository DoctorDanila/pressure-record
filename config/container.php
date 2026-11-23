<?php

declare(strict_types=1);

use core\user\application\service\AuthService;
use core\user\application\service\UserService;
use core\user\domain\repository\IUserRepository;
use core\user\infrastructure\repository\DbUserRepository;
use yii\di\Instance;
use yii\mail\MailerInterface;
use yii\di\Container;

/** @var Container $container */
// ---- Repositories ----
$container->setSingleton(IUserRepository::class, DbUserRepository::class);

// ---- Services ----
$container->setSingleton(UserService::class, [], [
    Instance::of(IUserRepository::class),
]);

$container->setSingleton(AuthService::class, [], [
    Instance::of(IUserRepository::class),
    Instance::of(MailerInterface::class),
]);
