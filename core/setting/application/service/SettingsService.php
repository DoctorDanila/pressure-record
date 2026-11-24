<?php

declare(strict_types=1);

namespace core\setting\application\service;

use core\setting\domain\dto\SettingsDto;
use core\setting\domain\entity\UserSettings;
use core\setting\domain\repository\ISettingsRepository;
use DateTimeImmutable;
use RuntimeException;

final class SettingsService
{
    public function __construct(
        private readonly ISettingsRepository $repository
    ) {
    }

    public function getForUser(int $userId): SettingsDto
    {
        return new SettingsDto(
            $this->repository->findByUserId($userId),
            $this->repository->findDevices($userId),
        );
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function updateForUser(int $userId, array $payload): SettingsDto
    {
        $current = $this->repository->findByUserId($userId);
        $values = [
            'systolic_high'     => $payload['systolic_high'] ?? $current->systolicHigh,
            'diastolic_high'    => $payload['diastolic_high'] ?? $current->diastolicHigh,
            'systolic_low'      => $payload['systolic_low'] ?? $current->systolicLow,
            'diastolic_low'     => $payload['diastolic_low'] ?? $current->diastolicLow,
            'exclude_first_day' => $payload['exclude_first_day'] ?? $current->excludeFirstDay,
        ];

        foreach (['systolic_high', 'diastolic_high', 'systolic_low', 'diastolic_low'] as $field) {
            if (filter_var($values[$field], FILTER_VALIDATE_INT) === false) {
                throw new RuntimeException("{$field} must be an integer.", 400);
            }
            $values[$field] = (int)$values[$field];
        }

        $ranges = [
            'systolic_high'     => [100, 250],
            'diastolic_high'    => [60, 150],
            'systolic_low'      => [50, 130],
            'diastolic_low'     => [30, 90],
        ];
        foreach ($ranges as $field => [$min, $max]) {
            if ($values[$field] < $min || $values[$field] > $max) {
                throw new RuntimeException("{$field} must be between {$min} and {$max}.", 400);
            }
        }
        if ($values['systolic_low'] >= $values['systolic_high']) {
            throw new RuntimeException('Lower systolic threshold must be below the upper threshold.', 400);
        }
        if ($values['diastolic_low'] >= $values['diastolic_high']) {
            throw new RuntimeException('Lower diastolic threshold must be below the upper threshold.', 400);
        }
        if (!is_bool($values['exclude_first_day'])) {
            $parsed = filter_var($values['exclude_first_day'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($parsed === null) {
                throw new RuntimeException('exclude_first_day must be a boolean.', 400);
            }
            $values['exclude_first_day'] = $parsed;
        }

        $this->repository->save(new UserSettings(
            $userId,
            $values['systolic_high'],
            $values['diastolic_high'],
            $values['systolic_low'],
            $values['diastolic_low'],
            $values['exclude_first_day'],
        ));

        return $this->getForUser($userId);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createDevice(int $userId, array $payload): array
    {
        $title = trim((string)($payload['title'] ?? ''));
        if ($title === '' || mb_strlen($title) > 255) {
            throw new RuntimeException('Device title is required and must be at most 255 characters.', 400);
        }

        $cuffType = (string)($payload['cuff_type'] ?? 'shoulder');
        if (!in_array($cuffType, ['shoulder', 'wrist'], true)) {
            throw new RuntimeException('cuff_type must be shoulder or wrist.', 400);
        }

        $calibrationDate = $payload['calibration_date'] ?? null;
        if ($calibrationDate !== null && $calibrationDate !== '') {
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', (string)$calibrationDate);
            if (!$date || $date->format('Y-m-d') !== $calibrationDate) {
                throw new RuntimeException('calibration_date must use YYYY-MM-DD format.', 400);
            }
        } else {
            $calibrationDate = null;
        }

        $device = [
            'title'             => $title,
            'cuff_type'         => $cuffType,
            'model'             => trim((string)($payload['model'] ?? '')) ?: null,
            'calibration_date'  => $calibrationDate,
        ];
        $device['id'] = $this->repository->createDevice($userId, $device);
        return $device;
    }

    public function deleteDevice(int $userId, int $deviceId): void
    {
        if ($deviceId < 1) {
            throw new RuntimeException('Invalid device id.', 400);
        }
        $this->repository->deleteDevice($userId, $deviceId);
    }
}
