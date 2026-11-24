<?php

declare(strict_types=1);

namespace core\setting\infrastructure\repository;

use core\setting\domain\entity\UserSettings;
use core\setting\domain\repository\ISettingsRepository;
use core\setting\infrastructure\persistence\DeviceAR;
use core\setting\infrastructure\persistence\UserSettingsAR;
use RuntimeException;
use Yii;
use yii\db\Exception;
use yii\db\Query;

final class DbSettingsRepository implements ISettingsRepository
{
    /**
     * @throws Exception
     */
    public function findByUserId(int $userId): UserSettings
    {
        $row = (new Query())
            ->from(UserSettingsAR::tableName())
            ->where(['user_id' => $userId])
            ->one();

        if ($row === false) {
            $settings = new UserSettings($userId);
            $this->save($settings);
            return $settings;
        }

        return $this->hydrate($row);
    }

    /**
     * @throws Exception
     */
    public function save(UserSettings $settings): void
    {
        $values = [
            'user_id'           => $settings->userId,
            'systolic_high'     => $settings->systolicHigh,
            'diastolic_high'    => $settings->diastolicHigh,
            'systolic_low'      => $settings->systolicLow,
            'diastolic_low'     => $settings->diastolicLow,
            'exclude_first_day' => $settings->excludeFirstDay,
        ];

        $existing = (new Query())
            ->from(UserSettingsAR::tableName())
            ->select('id')
            ->where(['user_id' => $settings->userId])
            ->scalar();

        if ($existing === false) {
            $command = Yii::$app->db->createCommand()->insert(UserSettingsAR::tableName(), $values);
        } else {
            unset($values['user_id']);
            $command = Yii::$app->db->createCommand()->update(
                UserSettingsAR::tableName(),
                $values,
                ['user_id' => $settings->userId],
            );
        }

        if (!$command->execute()) {
            throw new RuntimeException('Failed to save user settings.');
        }
    }

    public function findDevices(int $userId): array
    {
        return (new Query())
            ->select(['id', 'title', 'cuff_type', 'model', 'calibration_date', 'created_at'])
            ->from(DeviceAR::tableName())
            ->where(['user_id' => $userId])
            ->orderBy(['id' => SORT_ASC])
            ->all();
    }

    /**
     * @throws Exception
     */
    public function createDevice(int $userId, array $device): int
    {
        Yii::$app->db->createCommand()->insert(DeviceAR::tableName(), [
            'user_id'           => $userId,
            'title'             => $device['title'],
            'cuff_type'         => $device['cuff_type'],
            'model'             => $device['model'],
            'calibration_date'  => $device['calibration_date'],
        ])->execute();

        return (int)Yii::$app->db->getLastInsertID();
    }

    /**
     * @throws Exception
     */
    public function deleteDevice(int $userId, int $deviceId): void
    {
        $deleted = Yii::$app->db->createCommand()->delete(DeviceAR::tableName(), [
            'id' => $deviceId,
            'user_id' => $userId,
        ])->execute();

        if ($deleted === 0) {
            throw new RuntimeException('Device not found.', 404);
        }
    }

    /**
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): UserSettings
    {
        return new UserSettings(
            (int)$row['user_id'],
            (int)$row['systolic_high'],
            (int)$row['diastolic_high'],
            (int)$row['systolic_low'],
            (int)$row['diastolic_low'],
            (bool)$row['exclude_first_day'],
        );
    }
}
