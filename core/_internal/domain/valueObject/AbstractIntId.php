<?php

declare(strict_types=1);

namespace core\_internal\domain\valueObject;

use RuntimeException;

abstract class AbstractIntId
{
    protected int $value;

    /**
     * @throws RuntimeException
     */
    public function __construct(int $value)
    {
        if ($value < 0) {
            throw new RuntimeException(static::class . ' must be non-negative', 400);
        }
        $this->value = $value;
    }

    public function value(): int
    {
        return $this->value;
    }

    public function equals(self $other): bool
    {
        return $other::class === static::class && $other->value === $this->value;
    }

    public function isNew(): bool
    {
        return $this->value === 0;
    }
}
