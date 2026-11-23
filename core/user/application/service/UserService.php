<?php

namespace core\user\application\service;

use core\presentation\request\CreateUserRequest;
use core\presentation\request\UpdateUserEmailRequest;
use core\presentation\request\UpdateUserPasswordRequest;
use core\user\domain\dto\UserDto;
use core\user\domain\dto\UserFiltersDto;
use core\user\domain\entity\User;
use core\user\domain\repository\IUserRepository;
use core\user\domain\valueObject\Email;
use core\user\domain\valueObject\UserId;
use RuntimeException;
use yii\mail\MailerInterface;

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

    public function passwordChange(UserId $id, UpdateUserPasswordRequest $request): void
    {
        // TODO
    }

    public function emailChange(UserId $id, UpdateUserEmailRequest $request): UserDto
    {
        // TODO
    }

    public function validateEmail(Email $request): void
    {
        // TODO
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
