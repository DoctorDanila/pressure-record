<?php

declare(strict_types=1);

namespace core\record\domain\repository;

interface IRecordRepository
{
    /**
     * @param array<string, mixed> $series
     * @param array<int, array<string, int>> $measurements
     */
    public function create(int $userId, array $series, array $measurements): int;

    /**
     * @return array<string, mixed>|null
     */
    public function findById(int $userId, int $seriesId): ?array;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function findForUser(int $userId, ?string $from, ?string $to, ?string $slot, ?bool $planned, int $limit, int $offset): array;

    public function countForUser(int $userId, ?string $from, ?string $to, ?string $slot, ?bool $planned): int;

    /** Earliest planned measurement date for the user's complete history */
    public function findFirstPlannedMeasuredAt(int $userId): ?string;

    public function delete(int $userId, int $seriesId): void;

    public function deviceBelongsToUser(int $userId, int $deviceId): bool;
}
