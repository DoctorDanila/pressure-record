<?php

declare(strict_types=1);

namespace core\record\infrastructure\persistence;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property int $series_id
 * @property int $systolic
 */
final class RecordMeasurementAR extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%record_measurement}}';
    }
}
