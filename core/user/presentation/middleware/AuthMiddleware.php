<?php

declare(strict_types=1);

namespace core\user\presentation\middleware;

use core\_internal\identity\UserIdentity;
use core\user\application\service\AuthService;
use Yii;
use yii\base\InvalidConfigException;
use yii\di\NotInstantiableException;

final class AuthMiddleware
{
    private const COOKIE_NAME = 'auth_token';

    /**
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function handle(): void
    {
        $token = Yii::$app->request->cookies->getValue(self::COOKIE_NAME);

        if ($token === null || $token === '') {
            return;
        }

        /** @var AuthService $authService */
        $authService = Yii::$container->get(AuthService::class);
        $user = $authService->authenticateByToken($token);

        if ($user === null) {
            // Токен невалидный - удаляем куку
            Yii::$app->response->cookies->remove(self::COOKIE_NAME);
            return;
        }

        $identity = new UserIdentity(
            (string)$user->getId()->value(),
            $user->getEmail()->value(),
        );

        Yii::$app->user->setIdentity($identity);
    }
}
