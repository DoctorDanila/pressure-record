<?php

declare(strict_types=1);

namespace core\setting\domain\entity;

final class UserSettings
{
    public function __construct(
        public readonly int $userId,
        public readonly int $systolicHigh       = 135,
        public readonly int $diastolicHigh      = 85,
        public readonly int $systolicLow        = 90,
        public readonly int $diastolicLow       = 60,
        public readonly bool $excludeFirstDay   = true,
    ) {
    }

    /** @return array<string, int|bool> */
    public function toArray(): array
    {
        return [
            'systolic_high'     => $this->systolicHigh,
            'diastolic_high'    => $this->diastolicHigh,
            'systolic_low'      => $this->systolicLow,
            'diastolic_low'     => $this->diastolicLow,
            'exclude_first_day' => $this->excludeFirstDay,
        ];
    }
}
