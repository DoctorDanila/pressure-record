<?php

declare(strict_types=1);

namespace core\user\domain\entity;

use core\user\domain\valueObject\Email;
use core\user\domain\valueObject\UserId;
use DateTimeImmutable;

final class User
{
    private UserId $id;
    private Email $email;
    private string $passwordHash;
    private bool $emailVerified;
    private ?string $token;
    private DateTimeImmutable $createdAt;
    private DateTimeImmutable $updatedAt;

    public function __construct(
        UserId $id,
        Email $email,
        string $passwordHash,
        bool $emailVerified             = false,
        ?string $token                  = null,
        ?DateTimeImmutable $createdAt   = null,
        ?DateTimeImmutable $updatedAt   = null,
    ) {
        $this->id               = $id;
        $this->email            = $email;
        $this->passwordHash     = $passwordHash;
        $this->emailVerified    = $emailVerified;
        $this->token            = $token;
        $this->createdAt        = $createdAt ?? new DateTimeImmutable();
        $this->updatedAt        = $updatedAt ?? new DateTimeImmutable();
    }

    # -------------------- Fabrics --------------------

    public static function new(Email $email, string $passwordHash): self
    {
        return new self(
            new UserId(0),
            $email,
            $passwordHash
        );
    }

    # -------------------- Getters --------------------

    public function getId(): UserId
    {
        return $this->id;
    }

    public function getEmail(): Email
    {
        return $this->email;
    }

    public function getPasswordHash(): string
    {
        return $this->passwordHash;
    }

    public function getCreatedAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function isEmailVerified(): bool
    {
        return $this->emailVerified;
    }

    public function getToken(): ?string
    {
        return $this->token;
    }

    public function setToken(?string $token): void
    {
        $this->token = $token;
        $this->touch();
    }

    # -------------------- Mutators --------------------

    private function touch(): void
    {
        $this->updatedAt = new DateTimeImmutable();
    }

    public function changeEmail(Email $email): void
    {
        $this->email            = $email;
        $this->emailVerified    = false;
        $this->touch();
    }

    public function changePasswordHash(string $hash): void
    {
        $this->passwordHash = $hash;
        $this->touch();
    }

    public function verifyEmail(): void
    {
        if ($this->emailVerified) {
            return;
        }
        $this->emailVerified = true;
        $this->touch();
    }

    /**
     * @internal Используется только репозиторием для установки ID после сохранения
     */
    public function setId(UserId $id): void
    {
        $this->id = $id;
    }
}
