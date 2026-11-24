<?php

declare(strict_types=1);

namespace core\user\application\service;

use core\user\presentation\request\CreateUserRequest;
use core\user\presentation\request\UpdateUserEmailRequest;
use core\user\presentation\request\UpdateUserPasswordRequest;
use core\user\domain\dto\UserDto;
use core\user\domain\entity\User;
use core\user\domain\repository\IUserRepository;
use core\user\domain\valueObject\Email;
use core\user\domain\valueObject\UserId;
use Exception;
use RuntimeException;
use Yii;
use yii\mail\MailerInterface;

final class AuthService
{
    private const AUTH_TOKEN_BYTES = 32;
    private const HASH_ALGO = 'sha256';

    public function __construct(
        private readonly IUserRepository $userRepository,
        private readonly MailerInterface $mailer,
    ) {
    }

    /**
     * Регистрация нового пользователя.
     *
     * @throws RuntimeException
     */
    public function register(CreateUserRequest $request): UserDto
    {
        if ($this->userRepository->existsByEmail(new Email($request->email))) {
            throw new RuntimeException('Email already exists', 400);
        }

        $passwordHash = password_hash($request->password, PASSWORD_DEFAULT);
        $user = User::new(
            new Email($request->email),
            $passwordHash,
        );

        $this->userRepository->save($user);

        // Отправка письма с подтверждением
        $this->sendVerificationEmail($user);

        return UserDto::fromEntity($user);
    }

    /**
     * Подтверждение email через HMAC-токен.
     *
     * @throws RuntimeException
     */
    public function verifyEmail(int $userId, string $token): void
    {
        $user = $this->userRepository->findById(new UserId($userId));

        if ($user->isEmailVerified()) {
            return;
        }

        $expected = $this->buildEmailVerificationToken($user);

        if (!hash_equals($expected, $token)) {
            throw new RuntimeException('Invalid or expired verification token', 400);
        }

        $user->verifyEmail();
        $this->userRepository->save($user);
    }

    /**
     * Вход пользователя: проверка email+password, генерация auth_token.
     *
     * @return array{token: string, user: UserDto}
     * @throws RuntimeException
     * @throws Exception
     */
    public function login(string $email, string $password): array
    {
        try {
            $user = $this->userRepository->findByEmail(new Email($email));
        } catch (RuntimeException) {
            throw new RuntimeException('Invalid email or password', 401);
        }

        if (!password_verify($password, $user->getPasswordHash())) {
            throw new RuntimeException('Invalid email or password', 401);
        }

        // Генерируем новый токен доступа
        $token = bin2hex(random_bytes(self::AUTH_TOKEN_BYTES));
        $user->setToken($token);
        $this->userRepository->save($user);

        return [
            'token' => $token,
            'user' => UserDto::fromEntity($user),
        ];
    }

    public function emailChange(UserId $id, UpdateUserEmailRequest $request): UserDto
    {
        $user = $this->userRepository->findById($id);
        if ($this->userRepository->existsByEmail(new Email($request->email))) {
            throw new RuntimeException('Email already exists', 400);
        }

        $user->changeEmail(new Email($request->email));
        $this->userRepository->save($user);

        // Отправка письма с подтверждением
        $this->sendVerificationEmail($user);

        return UserDto::fromEntity($user);
    }

    public function passwordChange(UserId $id, UpdateUserPasswordRequest $request): void
    {
        $user = $this->userRepository->findById($id);
        if (!$user->isEmailVerified()) {
            throw new RuntimeException("Email not verified. Please verify your email before changing password.", 400);
        }
        if (!password_verify($request->oldPassword, $user->getPasswordHash())) {
            throw new RuntimeException('Current password is incorrect', 401);
        }

        $newHash = password_hash($request->newPassword, PASSWORD_DEFAULT);
        $user->changePasswordHash($newHash);
        $this->userRepository->save($user);
    }

    /**
     * Аутентификация по токену доступа.
     */
    public function authenticateByToken(string $token): ?User
    {
        return $this->userRepository->findByToken($token);
    }

    /**
     * Выход: очищаем токен у пользователя.
     *
     * @throws RuntimeException
     */
    public function logout(UserId $id): void
    {
        $user = $this->userRepository->findById($id);
        $user->setToken(null);
        $this->userRepository->save($user);
    }

    /**
     * Сформировать HMAC-токен для подтверждения email.
     */
    public function buildEmailVerificationToken(User $user): string
    {
        $secret = $this->getAppSecret();
        $data = $user->getId()->value() . ':' . $user->getEmail()->value();
        return hash_hmac(self::HASH_ALGO, $data, $secret);
    }

    /**
     * Отправить письмо с подтверждением email.
     *
     * @throws RuntimeException
     */
    private function sendVerificationEmail(User $user): void
    {
        $token = $this->buildEmailVerificationToken($user);
        $userId = $user->getId()->value();
        $appName = $_ENV['APP_NAME'] ?? 'Pressure Record';

        $message = $this->mailer->compose('verify-email', [
            'userId' => $userId,
            'token'  => $token,
            'appName' => $appName,
        ])
            ->setTo($user->getEmail()->value())
            ->setFrom([$_ENV['MAILER_FROM_ADDRESS'] ?? 'noreply@example.com' => $appName])
            ->setSubject('Подтверждение email — ' . $appName);

        if (!$message->send()) {
            Yii::error('Failed to send verification email to ' . $user->getEmail()->value(), __METHOD__);
        }
    }

    private function getAppSecret(): string
    {
        $secret = $_ENV['APP_SECRET'] ?? '';
        if ($secret === '') {
            throw new RuntimeException('APP_SECRET is not configured', 500);
        }
        return $secret;
    }
}
