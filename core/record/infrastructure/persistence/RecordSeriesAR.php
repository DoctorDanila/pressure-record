<?php

declare(strict_types=1);

namespace core\record\infrastructure\persistence;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property int $user_id
 * @property string $measured_at
 */
final class RecordSeriesAR extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%record_series}}';
    }
}
