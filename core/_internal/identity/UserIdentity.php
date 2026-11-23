<?php

declare(strict_types=1);

namespace core\_internal\identity;

use core\user\domain\repository\IUserRepository;
use core\user\domain\valueObject\UserId;
use Throwable;
use Yii;
use yii\web\IdentityInterface;

final class UserIdentity implements IdentityInterface
{
    public function __construct(
        private readonly string $id,
        private readonly string $email = '',
    ) {
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getAuthKey(): ?string
    {
        return null;
    }

    public function validateAuthKey($authKey): bool
    {
        return false;
    }

    public static function findIdentity($id): ?self
    {
        try {
            $repo = Yii::$container->get(IUserRepository::class);
            $user = $repo->findById(new UserId((int)$id));
            return new self((string)$user->getId()->value(), $user->getEmail()->value());
        } catch (Throwable) {
            return null;
        }
    }

    public static function findIdentityByAccessToken($token, $type = null): ?self
    {
        try {
            $repo = Yii::$container->get(IUserRepository::class);
            $user = $repo->findByToken($token);
            if ($user === null) {
                return null;
            }
            return new self((string)$user->getId()->value(), $user->getEmail()->value());
        } catch (Throwable) {
            return null;
        }
    }
}
