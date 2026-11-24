<?php

declare(strict_types=1);

use core\record\application\service\RecordService;
use core\record\domain\repository\IRecordRepository;
use core\record\domain\service\SeriesCalculator;
use core\record\infrastructure\repository\DbRecordRepository;
use core\setting\application\service\SettingsService;
use core\setting\domain\repository\ISettingsRepository;
use core\setting\infrastructure\repository\DbSettingsRepository;
use core\user\application\service\AuthService;
use core\user\application\service\UserService;
use core\user\domain\repository\IUserRepository;
use core\user\infrastructure\repository\DbUserRepository;
use yii\di\Container;
use yii\di\Instance;
use yii\mail\MailerInterface;

/** @var Container $container */
$container = Yii::$container;

// ---- Infrastructure services ----
$container->setSingleton(
    MailerInterface::class,
    static function (): MailerInterface {
        return Yii::$app->get('mailer');
    }
);

$container->setSingleton(IUserRepository::class, DbUserRepository::class);
$container->setSingleton(ISettingsRepository::class, DbSettingsRepository::class);
$container->setSingleton(IRecordRepository::class, DbRecordRepository::class);

$container->setSingleton(UserService::class, [], [Instance::of(IUserRepository::class)]);
$container->setSingleton(AuthService::class, [], [
    Instance::of(IUserRepository::class),
    Instance::of(MailerInterface::class),
]);
$container->setSingleton(SettingsService::class, [], [Instance::of(ISettingsRepository::class)]);
$container->setSingleton(SeriesCalculator::class, SeriesCalculator::class);
$container->setSingleton(RecordService::class, [], [
    Instance::of(IRecordRepository::class),
    Instance::of(SeriesCalculator::class),
]);
