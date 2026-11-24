<?php

declare(strict_types=1);

namespace core\record\application\service;

use core\record\domain\dto\RecordFiltersDto;
use core\record\domain\dto\RecordSeriesDto;
use core\record\domain\repository\IRecordRepository;
use core\record\domain\service\SeriesCalculator;
use Exception;
use RuntimeException;
use DateTimeImmutable;
use DateTimeZone;
use Throwable;

final class RecordService
{
    private const TIMEZONE = 'Europe/Moscow';
    private const ALLOWED_SLOTS = ['morning', 'day', 'evening', 'unscheduled'];
    private const ALLOWED_SYMPTOMS = [
        'headache', 'weakness', 'drowsiness', 'dizziness', 'nausea',
        'palpitations', 'chest_discomfort', 'shortness_of_breath', 'other',
    ];

    public function __construct(
        private readonly IRecordRepository $repository,
        private readonly SeriesCalculator $calculator,
    ) {
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $settings
     */
    public function create(int $userId, array $payload, array $settings): RecordSeriesDto
    {
        $slot = (string)($payload['slot'] ?? 'morning');
        if (!in_array($slot, self::ALLOWED_SLOTS, true)) {
            throw new RuntimeException('slot must be morning, day, evening or unscheduled.', 400);
        }

        $measurements = $this->validateMeasurements($payload['measurements'] ?? null);
        $firstPairDifference = max(
            abs($measurements[0]['systolic'] - $measurements[1]['systolic']),
            abs($measurements[0]['diastolic'] - $measurements[1]['diastolic']),
        );
        if ($firstPairDifference > 10 && count($measurements) < 3) {
            throw new RuntimeException('The first two readings differ by more than 10 mmHg. Add a third reading.', 400);
        }

        $deviceId = isset($payload['device_id']) && $payload['device_id'] !== ''
            ? filter_var($payload['device_id'], FILTER_VALIDATE_INT)
            : null;
        if ($deviceId !== null && ($deviceId === false || $deviceId < 1)) {
            throw new RuntimeException('device_id must be a positive integer.', 400);
        }

        $isPlanned = $slot !== 'unscheduled';
        if (array_key_exists('is_planned', $payload)) {
            $parsed = filter_var($payload['is_planned'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($parsed === null) {
                throw new RuntimeException('is_planned must be a boolean.', 400);
            }
            $isPlanned = $parsed && $slot !== 'unscheduled';
        }

        $symptoms = $payload['symptoms'] ?? [];
        if (!is_array($symptoms)) {
            throw new RuntimeException('symptoms must be an array.', 400);
        }
        $symptoms = array_values(array_unique(array_map('strval', $symptoms)));
        $unknownSymptoms = array_diff($symptoms, self::ALLOWED_SYMPTOMS);
        if ($unknownSymptoms !== []) {
            throw new RuntimeException('Unknown symptom code: ' . reset($unknownSymptoms), 400);
        }

        $notes = trim((string)($payload['notes'] ?? ''));
        if (mb_strlen($notes) > 5000) {
            throw new RuntimeException('notes must be at most 5000 characters.', 400);
        }

        $thresholds = [
            'systolic_high'     => (int)($settings['systolic_high'] ?? 135),
            'diastolic_high'    => (int)($settings['diastolic_high'] ?? 85),
            'systolic_low'      => (int)($settings['systolic_low'] ?? 90),
            'diastolic_low'     => (int)($settings['diastolic_low'] ?? 60),
        ];
        $calculation = $this->calculator->calculate($measurements, $thresholds);

        $series = [
            'device_id'         => $deviceId,
            'slot'              => $slot,
            'is_planned'        => $isPlanned,
            'measured_at'       => $this->normalizeDateTime($payload['measured_at'] ?? null),
            'notes'             => $notes === '' ? null : $notes,
            'symptoms'          => $symptoms,
            'settings_snapshot' => [
                ...$thresholds,
                'exclude_first_day' => (bool)($settings['exclude_first_day'] ?? true),
            ],
            'calculation' => $calculation,
        ];

        $id = $this->repository->create($userId, $series, $measurements);
        $saved = $this->repository->findById($userId, $id);
        if ($saved === null) {
            throw new RuntimeException('Record was created but could not be loaded.', 500);
        }

        return new RecordSeriesDto($this->decorate($saved));
    }

    public function get(int $userId, int $id): RecordSeriesDto
    {
        $row = $this->repository->findById($userId, $id);
        if ($row === null) {
            throw new RuntimeException('Record series not found.', 404);
        }
        return new RecordSeriesDto($this->decorate($row));
    }

    /**
     * @return RecordSeriesDto[]
     */
    public function getList(int $userId, RecordFiltersDto $filters): array
    {
        $this->validateFilters($filters);
        $rows = $this->repository->findForUser(
            $userId,
            $filters->from,
            $filters->to,
            $filters->slot,
            $filters->planned,
            $filters->limit,
            $filters->offset,
        );
        return array_map(fn(array $row): RecordSeriesDto => new RecordSeriesDto($this->decorate($row)), $rows);
    }

    public function count(int $userId, RecordFiltersDto $filters): int
    {
        $this->validateFilters($filters);
        return $this->repository->countForUser($userId, $filters->from, $filters->to, $filters->slot, $filters->planned);
    }

    public function delete(int $userId, int $id): void
    {
        if ($id < 1) {
            throw new RuntimeException('Invalid record id.', 400);
        }
        $this->repository->delete($userId, $id);
    }

    /**
     * @param array<string, mixed> $settings
     * @return array<string, mixed>
     * @throws Exception
     */
    public function dashboard(int $userId, array $settings, ?string $from, ?string $to): array
    {
        $filters = new RecordFiltersDto($from, $to, null, null, 5000, 0);
        $this->validateFilters($filters);
        // Pull six extra calendar days before the selected period so the first
        // visible rolling-average point has its complete seven-day window.
        $contextFrom = $from;
        if ($from !== null) {
            $contextFrom = (new DateTimeImmutable($from, new DateTimeZone(self::TIMEZONE)))
                ->modify('-6 days')
                ->format('Y-m-d');
        }
        $contextRows = $this->repository->findForUser($userId, $contextFrom, $to, null, null, 5000, 0);
        $contextRecords = array_map(fn(array $row): array => $this->decorate($row), $contextRows);

        $records = array_values(array_filter($contextRecords, static fn(array $row): bool =>
            ($from === null || substr($row['measured_at'], 0, 10) >= $from)
            && ($to === null || substr($row['measured_at'], 0, 10) <= $to)
        ));

        $planned = array_values(array_filter($records, static fn(array $row): bool => $row['is_planned']));
        usort($planned, static fn(array $a, array $b): int => strcmp($a['measured_at'], $b['measured_at']));

        $excludedDate = null;
        if (($settings['exclude_first_day'] ?? true)) {
            $firstPlannedAt = $this->repository->findFirstPlannedMeasuredAt($userId);
            $excludedDate = $firstPlannedAt === null ? null : substr($firstPlannedAt, 0, 10);
        }
        $analytic = array_values(array_filter($planned, static fn(array $row): bool =>
            $excludedDate === null || substr($row['measured_at'], 0, 10) !== $excludedDate
        ));

        $values             = array_map(static fn(array $row): array => $row['metrics']['point'], $analytic);
        $systolicValues     = array_column($values, 'systolic');
        $diastolicValues    = array_column($values, 'diastolic');
        $pulseValues        = array_column($values, 'pulse');

        $summary = [
            'series_count'              => count($records),
            'planned_series_count'      => count($planned),
            'unscheduled_series_count'  => count($records) - count($planned),
            'included_series_count'     => count($analytic),
            'average_systolic'          => $this->average($systolicValues),
            'average_diastolic'         => $this->average($diastolicValues),
            'average_pulse'             => $this->average($pulseValues),
            'time_in_target_percent' => $analytic === [] ? null : round(
                count(array_filter($analytic, static fn(array $row): bool => $row['metrics']['category'] === 'normal')) / count($analytic) * 100,
                1,
            ),
            'systolic_sd'               => $this->standardDeviation($systolicValues),
            'systolic_cv'               => $this->coefficientOfVariation($systolicValues),
            'diastolic_sd'              => $this->standardDeviation($diastolicValues),
            'diastolic_cv'              => $this->coefficientOfVariation($diastolicValues),
            'trend_systolic_per_week'   => $this->trendPerWeek($analytic, 'systolic'),
            'trend_diastolic_per_week'  => $this->trendPerWeek($analytic, 'diastolic'),
            'trend_available'           => count($analytic) >= 10,
            'excluded_first_day'        => $excludedDate,
            'consecutive_outside_target' => $this->outsideTargetStreak($analytic),
        ];

        return [
            'summary' => $summary,
            'timeseries' => array_values(array_filter(
                $this->buildTimeseries($contextRecords, $excludedDate),
                static fn(array $point): bool =>
                    ($from === null || $point['date'] >= $from)
                    && ($to === null || $point['date'] <= $to)
            )),
            'weekly'        => $this->buildWeekly($analytic),
            'heatmap'       => $this->buildHeatmap($records),
            'distribution'  => $this->buildDistribution($systolicValues),
            'records'       => $records,
            'method' => [
                'excluded_first_day'    => (bool)($settings['exclude_first_day'] ?? true),
                'excluded_date'         => $excludedDate,
                'trend_minimum_series'  => 10,
                'timezone'              => self::TIMEZONE,
                'disclaimer'            => 'Сервис предназначен для самоконтроля и накопления данных, не ставит диагнозов и не заменяет консультацию врача. Не меняйте терапию самостоятельно.',
            ],
        ];
    }

    /**
     * @param mixed $input
     * @return array<int, array{systolic:int,diastolic:int,pulse:int}>
     */
    private function validateMeasurements(mixed $input): array
    {
        if (!is_array($input) || count($input) < 2 || count($input) > 3) {
            throw new RuntimeException('A series must contain two or three measurements.', 400);
        }

        $measurements = [];
        foreach (array_values($input) as $index => $item) {
            if (!is_array($item)) {
                throw new RuntimeException('Each measurement must be an object.', 400);
            }
            $values = [];
            foreach (['systolic' => [40, 300], 'diastolic' => [20, 200], 'pulse' => [20, 250]] as $field => [$min, $max]) {
                $value = filter_var($item[$field] ?? null, FILTER_VALIDATE_INT);
                if ($value === false || $value < $min || $value > $max) {
                    throw new RuntimeException(sprintf('Measurement %d: %s must be between %d and %d.', $index + 1, $field, $min, $max), 400);
                }
                $values[$field] = $value;
            }
            if ($values['systolic'] <= $values['diastolic']) {
                throw new RuntimeException(sprintf('Measurement %d: systolic pressure must be higher than diastolic pressure.', $index + 1), 400);
            }
            $measurements[] = $values;
        }
        return $measurements;
    }

    private function normalizeDateTime(mixed $value): string
    {
        try {
            $timezone = new DateTimeZone(self::TIMEZONE);
            $date = $value === null || $value === ''
                ? new DateTimeImmutable('now', $timezone)
                : new DateTimeImmutable((string)$value, $timezone);
            return $date->setTimezone($timezone)->format('Y-m-d H:i:s');
        } catch (Throwable) {
            throw new RuntimeException('measured_at must be a valid date/time value.', 400);
        }
    }

    private function validateFilters(RecordFiltersDto $filters): void
    {
        foreach (['from' => $filters->from, 'to' => $filters->to] as $field => $value) {
            if ($value === null) {
                continue;
            }
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
            if (!$date || $date->format('Y-m-d') !== $value) {
                throw new RuntimeException("{$field} must use YYYY-MM-DD format.", 400);
            }
        }
        if ($filters->from !== null && $filters->to !== null && $filters->from > $filters->to) {
            throw new RuntimeException('from must not be later than to.', 400);
        }
        if ($filters->slot !== null && !in_array($filters->slot, self::ALLOWED_SLOTS, true)) {
            throw new RuntimeException('Invalid slot filter.', 400);
        }
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function decorate(array $row): array
    {
        $snapshot = $row['settings_snapshot'] ?? [];
        $thresholds = [
            'systolic_high'     => (int)($snapshot['systolic_high'] ?? 135),
            'diastolic_high'    => (int)($snapshot['diastolic_high'] ?? 85),
            'systolic_low'      => (int)($snapshot['systolic_low'] ?? 90),
            'diastolic_low'     => (int)($snapshot['diastolic_low'] ?? 60),
        ];
        $measurements = array_map(static fn(array $item): array => [
            'systolic'  => (int)$item['systolic'],
            'diastolic' => (int)$item['diastolic'],
            'pulse'     => (int)$item['pulse'],
        ], $row['measurements'] ?? []);
        $metrics = $this->calculator->calculate($measurements, $thresholds);

        $row['metrics']         = $metrics;
        $row['quality_flag']    = $metrics['quality_flag'];
        return $row;
    }

    /**
     * @param array<int, float|int> $values
     */
    private function average(array $values): ?float
    {
        return $values === [] ? null : round(array_sum($values) / count($values), 1);
    }

    /**
     * @param array<int, float|int> $values
     */
    private function standardDeviation(array $values): ?float
    {
        $count = count($values);
        if ($count < 2) {
            return null;
        }
        $mean = array_sum($values) / $count;
        $sum = 0.0;
        foreach ($values as $value) {
            $sum += ($value - $mean) ** 2;
        }
        return round(sqrt($sum / ($count - 1)), 2);
    }

    /**
     * @param array<int, float|int> $values
     */
    private function coefficientOfVariation(array $values): ?float
    {
        $mean = $this->average($values);
        $sd = $this->standardDeviation($values);
        return $mean === null || $sd === null || $mean == 0.0 ? null : round($sd / $mean * 100, 2);
    }

    /**
     * @param array<int, array<string, mixed>> $records
     */
    private function trendPerWeek(array $records, string $field): ?float
    {
        if (count($records) < 10) {
            return null;
        }
        $origin = strtotime($records[0]['measured_at']);
        $points = [];
        foreach ($records as $record) {
            $points[] = [
                'x' => (strtotime($record['measured_at']) - $origin) / 86400,
                'y' => (float)$record['metrics']['point'][$field],
            ];
        }
        $meanX = array_sum(array_column($points, 'x')) / count($points);
        $meanY = array_sum(array_column($points, 'y')) / count($points);
        $numerator = 0.0;
        $denominator = 0.0;
        foreach ($points as $point) {
            $numerator += ($point['x'] - $meanX) * ($point['y'] - $meanY);
            $denominator += ($point['x'] - $meanX) ** 2;
        }
        return $denominator == 0.0 ? null : round(($numerator / $denominator) * 7, 2);
    }

    /**
     * @param array<int, array<string, mixed>> $records
     * @return array<int, array<string, mixed>>
     * @throws Exception
     */
    private function buildTimeseries(array $records, ?string $excludedDate): array
    {
        $planned = array_values(array_filter($records, static fn(array $row): bool => $row['is_planned']));
        $result = [];
        foreach ($records as $record) {
            $metrics = $record['metrics'];
            $rollingSystolic = null;
            $rollingDiastolic = null;
            if ($record['is_planned']) {
                $date = new DateTimeImmutable($record['measured_at'], new DateTimeZone(self::TIMEZONE));
                $from = $date->modify('-6 days')->format('Y-m-d 00:00:00');
                $to = $date->format('Y-m-d 23:59:59');
                $window = array_filter($planned, static fn(array $item): bool =>
                    $item['measured_at'] >= $from
                    && $item['measured_at'] <= $to
                    && ($excludedDate === null || substr($item['measured_at'], 0, 10) !== $excludedDate)
                );
                $rollingSystolic = $this->average(array_map(static fn(array $item): float =>
                    (float)$item['metrics']['point']['systolic'], $window
                ));
                $rollingDiastolic = $this->average(array_map(static fn(array $item): float =>
                    (float)$item['metrics']['point']['diastolic'], $window
                ));
            }

            $isPlanned = (bool)$record['is_planned'];
            $result[] = [
                'id'                    => $record['id'],
                'date'                  => substr($record['measured_at'], 0, 10),
                'measured_at'           => $record['measured_at'],
                'slot'                  => $record['slot'],
                'is_planned'            => $isPlanned,
                'systolic'              => $metrics['point']['systolic'],
                'diastolic'             => $metrics['point']['diastolic'],
                'planned_systolic'      => $isPlanned ? $metrics['point']['systolic'] : null,
                'planned_diastolic'     => $isPlanned ? $metrics['point']['diastolic'] : null,
                'unscheduled_systolic'  => $isPlanned ? null : $metrics['point']['systolic'],
                'unscheduled_diastolic' => $isPlanned ? null : $metrics['point']['diastolic'],
                'pulse'                 => $metrics['point']['pulse'],
                'pulse_pressure'        => $metrics['pulse_pressure'],
                'map'                   => $metrics['map'],
                'rolling_systolic_7d'   => $rollingSystolic,
                'rolling_diastolic_7d'  => $rollingDiastolic,
                'category'              => $metrics['category'],
                'quality_flag'          => $metrics['quality_flag'],
            ];
        }
        return $result;
    }

    /**
     * @param array<int, array<string, mixed>> $records
     * @return array<int, array<string, mixed>>
     * @throws Exception
     */
    private function buildWeekly(array $records): array
    {
        $weeks = [];
        foreach ($records as $record) {
            $date = new DateTimeImmutable($record['measured_at'], new DateTimeZone(self::TIMEZONE));
            $key = $date->format('o-\WW');
            $weeks[$key] ??= ['week' => $key, 'normal' => 0, 'low' => 0, 'high' => 0, 'total' => 0];
            $weeks[$key][$record['metrics']['category']]++;
            $weeks[$key]['total']++;
        }
        return array_values($weeks);
    }

    /**
     * @param array<int, array<string, mixed>> $records
     * @return array<int, array<string, mixed>>
     */
    private function buildHeatmap(array $records): array
    {
        $slots = ['morning', 'day', 'evening'];
        $days = [];
        foreach ($records as $record) {
            $day = substr($record['measured_at'], 0, 10);
            $days[$day] ??= ['date' => $day, 'morning' => null, 'day' => null, 'evening' => null];
            if (in_array($record['slot'], $slots, true) && $days[$day][$record['slot']] === null) {
                $days[$day][$record['slot']] = [
                    'category'      => $record['metrics']['category'],
                    'planned'       => $record['is_planned'],
                    'quality_flag'  => $record['quality_flag'],
                    'id'            => $record['id'],
                ];
            }
        }
        ksort($days);
        return array_values($days);
    }

    /**
     * @param array<int, float|int> $values
     * @return array<int, array{range:string,count:int}>
     */
    private function buildDistribution(array $values): array
    {
        if ($values === []) {
            return [];
        }
        $min = floor(min($values) / 10) * 10;
        $max = floor(max($values) / 10) * 10 + 10;
        if ($max <= $min) {
            $max = $min + 10;
        }
        $bins = [];
        for ($start = (int)$min; $start < $max; $start += 10) {
            $bins[$start] = 0;
        }
        foreach ($values as $value) {
            $key = min((int)$max - 10, (int)(floor($value / 10) * 10));
            $bins[$key] = ($bins[$key] ?? 0) + 1;
        }
        $result = [];
        foreach ($bins as $start => $count) {
            $result[] = ['range' => $start . '–' . ($start + 9), 'count' => $count];
        }
        return $result;
    }

    /**
     * @param array<int, array<string, mixed>> $records
     */
    private function outsideTargetStreak(array $records): int
    {
        $streak = 0;
        foreach (array_reverse($records) as $record) {
            if ($record['metrics']['category'] === 'normal') {
                break;
            }
            $streak++;
        }
        return $streak;
    }
}
