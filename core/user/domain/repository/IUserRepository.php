<?php

declare(strict_types=1);

namespace core\user\domain\repository;

use core\user\domain\dto\UserFiltersDto;
use core\user\domain\entity\User;
use core\user\domain\valueObject\Email;
use core\user\domain\valueObject\UserId;

interface IUserRepository
{
    public function findByEmail(Email $email): ?User;

    public function findById(UserId $id): ?User;

    public function findByToken(string $token): ?User;

    /** @return User[] */
    public function findWithFilters(UserFiltersDto $filters): array;

    public function countWithFilters(UserFiltersDto $filters): int;

    public function save(User $user): void;

    public function delete(UserId $id): void;
}
