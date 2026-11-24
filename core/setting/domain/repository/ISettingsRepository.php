<?php

declare(strict_types=1);

namespace core\setting\domain\repository;

use core\setting\domain\entity\UserSettings;

interface ISettingsRepository
{
    public function findByUserId(int $userId): UserSettings;

    public function save(UserSettings $settings): void;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findDevices(int $userId): array;

    /**
     * @param array<string, mixed> $device
     */
    public function createDevice(int $userId, array $device): int;

    public function deleteDevice(int $userId, int $deviceId): void;
}
