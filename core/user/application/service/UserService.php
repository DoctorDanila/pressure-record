<?php

namespace core\user\application\service;

use core\user\domain\dto\UserDto;
use core\user\domain\dto\UserFiltersDto;
use core\user\domain\repository\IUserRepository;
use core\user\domain\valueObject\UserId;
use RuntimeException;

final class UserService
{
    public function __construct(
        private readonly IUserRepository $userRepository,
    ) {
    }

    public function deleteWithUserId(UserId $id): void
    {
        if ($id->isNew()) {
            throw new RuntimeException("User not created", 400);
        }
        // Ищем пользователя, для проверки существования
        $this->userRepository->findById($id);
        $this->userRepository->delete($id);
    }

    public function getUserWithId(UserId $id): UserDto
    {
        $user = $this->userRepository->findById($id);
        return UserDto::fromEntity($user);
    }

    /**
     * @return UserDto[]
     */
    public function getUserWithFilters(UserFiltersDto $filters): array
    {
        $users = $this->userRepository->findWithFilters($filters);
        return array_map([UserDto::class, 'fromEntity'], $users);
    }

    public function getUserCountWithFilters(UserFiltersDto $filters): int
    {
        return $this->userRepository->countWithFilters($filters);
    }
}
