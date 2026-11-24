<?php

declare(strict_types=1);

namespace core\record\infrastructure\repository;

use core\record\domain\repository\IRecordRepository;
use core\record\infrastructure\persistence\RecordMeasurementAR;
use core\record\infrastructure\persistence\RecordSeriesAR;
use JsonException;
use RuntimeException;
use Throwable;
use Yii;
use yii\db\Exception;
use yii\db\Query;

final class DbRecordRepository implements IRecordRepository
{
    /**
     * @throws Exception
     * @throws Throwable
     * @throws JsonException
     */
    public function create(int $userId, array $series, array $measurements): int
    {
        $transaction = Yii::$app->db->beginTransaction();
        try {
            if (!empty($series['device_id']) && !$this->deviceBelongsToUser($userId, (int)$series['device_id'])) {
                throw new RuntimeException('Selected device was not found.', 404);
            }

            Yii::$app->db->createCommand()->insert(RecordSeriesAR::tableName(), [
                'user_id'           => $userId,
                'device_id'         => $series['device_id'],
                'slot'              => $series['slot'],
                'is_planned'        => $series['is_planned'],
                'measured_at'       => $series['measured_at'],
                'notes'             => $series['notes'],
                'symptoms'          => json_encode($series['symptoms'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'settings_snapshot' => json_encode($series['settings_snapshot'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'measurement_count' => $series['calculation']['measurement_count'],
                'quality_flag'      => $series['calculation']['quality_flag'],
                'systolic_range'    => $series['calculation']['ranges']['systolic'],
                'diastolic_range'   => $series['calculation']['ranges']['diastolic'],
            ])->execute();
            $seriesId = (int)Yii::$app->db->getLastInsertID();

            foreach ($measurements as $index => $measurement) {
                Yii::$app->db->createCommand()->insert(RecordMeasurementAR::tableName(), [
                    'series_id' => $seriesId,
                    'position'  => $index + 1,
                    'systolic'  => $measurement['systolic'],
                    'diastolic' => $measurement['diastolic'],
                    'pulse'     => $measurement['pulse'],
                ])->execute();
            }

            $transaction->commit();
            return $seriesId;
        } catch (Throwable $e) {
            $transaction->rollBack();
            throw $e;
        }
    }

    public function findById(int $userId, int $seriesId): ?array
    {
        $row = (new Query())
            ->from(RecordSeriesAR::tableName())
            ->where(['id' => $seriesId, 'user_id' => $userId])
            ->one();
        if ($row === false) {
            return null;
        }
        return $this->hydrateMany([$row])[0];
    }

    public function findForUser(
        int $userId,
        ?string $from,
        ?string $to,
        ?string $slot,
        ?bool $planned,
        int $limit,
        int $offset,
    ): array {
        $query = $this->baseQuery($userId, $from, $to, $slot, $planned)
            ->orderBy(['measured_at' => SORT_DESC, 'id' => SORT_DESC])
            ->limit($limit)
            ->offset($offset);

        return $this->hydrateMany($query->all());
    }

    public function countForUser(int $userId, ?string $from, ?string $to, ?string $slot, ?bool $planned): int
    {
        return (int)$this->baseQuery($userId, $from, $to, $slot, $planned)->count();
    }

    public function findFirstPlannedMeasuredAt(int $userId): ?string
    {
        $value = (new Query())
            ->select('measured_at')
            ->from(RecordSeriesAR::tableName())
            ->where(['user_id' => $userId, 'is_planned' => true])
            ->orderBy(['measured_at' => SORT_ASC, 'id' => SORT_ASC])
            ->scalar();

        return $value === false || $value === null ? null : (string)$value;
    }

    /**
     * @throws Exception
     */
    public function delete(int $userId, int $seriesId): void
    {
        $deleted = Yii::$app->db->createCommand()->delete(RecordSeriesAR::tableName(), [
            'id' => $seriesId,
            'user_id' => $userId,
        ])->execute();

        if ($deleted === 0) {
            throw new RuntimeException('Record series not found.', 404);
        }
    }

    public function deviceBelongsToUser(int $userId, int $deviceId): bool
    {
        return (new Query())
            ->from('{{%device}}')
            ->where(['id' => $deviceId, 'user_id' => $userId])
            ->exists();
    }

    private function baseQuery(int $userId, ?string $from, ?string $to, ?string $slot, ?bool $planned): Query
    {
        $query = (new Query())->from(RecordSeriesAR::tableName())->where(['user_id' => $userId]);
        if ($from !== null) {
            $query->andWhere(['>=', 'measured_at', $from . ' 00:00:00']);
        }
        if ($to !== null) {
            $query->andWhere(['<=', 'measured_at', $to . ' 23:59:59']);
        }
        if ($slot !== null) {
            $query->andWhere(['slot' => $slot]);
        }
        if ($planned !== null) {
            $query->andWhere(['is_planned' => $planned]);
        }
        return $query;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function hydrateMany(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $ids = array_map(static fn(array $row): int => (int)$row['id'], $rows);
        $measurementRows = (new Query())
            ->select(['series_id', 'position', 'systolic', 'diastolic', 'pulse'])
            ->from(RecordMeasurementAR::tableName())
            ->where(['series_id' => $ids])
            ->orderBy(['series_id' => SORT_ASC, 'position' => SORT_ASC])
            ->all();

        $measurementsBySeries = [];
        foreach ($measurementRows as $item) {
            $seriesId = (int)$item['series_id'];
            $measurementsBySeries[$seriesId][] = [
                'position'  => (int)$item['position'],
                'systolic'  => (int)$item['systolic'],
                'diastolic' => (int)$item['diastolic'],
                'pulse'     => (int)$item['pulse'],
            ];
        }

        foreach ($rows as &$row) {
            $row['id']                  = (int)$row['id'];
            $row['user_id']             = (int)$row['user_id'];
            $row['device_id']           = $row['device_id'] === null ? null : (int)$row['device_id'];
            $row['is_planned']          = (bool)$row['is_planned'];
            $row['quality_flag']        = (bool)$row['quality_flag'];
            $row['measurement_count']   = (int)$row['measurement_count'];
            $row['symptoms']            = $this->decodeJson($row['symptoms'] ?? null);
            $row['settings_snapshot']   = $this->decodeJson($row['settings_snapshot'] ?? null);
            $row['measurements']        = $measurementsBySeries[$row['id']] ?? [];
        }
        unset($row);

        return $rows;
    }

    /**
     * @param string|null $value
     * @return array
     */
    private function decodeJson(?string $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }
}
