<?php

declare(strict_types=1);

namespace core\user\domain\valueObject;

use RuntimeException;

final class Email
{
    private string $value;

    /**
     * @throws RuntimeException
     */
    public function __construct(string $email)
    {
        $trimmed = trim($email);
        if (!preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $trimmed)) {
            throw new RuntimeException('Invalid email address', 400);
        }
        $this->value = $trimmed;
    }

    public function value(): string
    {
        return $this->value;
    }
}
