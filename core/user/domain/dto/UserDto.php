<?php

declare(strict_types=1);

namespace core\user\domain\dto;

use core\user\domain\entity\User;
use JsonSerializable;

class UserDto implements JsonSerializable
{
    private int $id;
    private string $email;
    private bool $emailVerified;
    private string $createdAt;
    private string $updatedAt;

    public function __construct(
        int $id,
        string $email,
        bool $emailVerified,
        string $createdAt,
        string $updatedAt,
    ) {
        $this->id               = $id;
        $this->email            = $email;
        $this->emailVerified    = $emailVerified;
        $this->createdAt        = $createdAt;
        $this->updatedAt        = $updatedAt;
    }

    public static function fromEntity(User $user): self
    {
        return new self(
            $user->getId()->value(),
            $user->getEmail()->value(),
            $user->isEmailVerified(),
            $user->getCreatedAt()->format('Y-m-d H:i:s'),
            $user->getUpdatedAt()->format('Y-m-d H:i:s'),
        );
    }

    public function jsonSerialize(): array
    {
        return [
            'id'                => $this->id,
            'email'             => $this->email,
            'email_verified'    => $this->emailVerified,
            'created_at'        => $this->createdAt,
            'updated_at'        => $this->updatedAt,
        ];
    }
}
