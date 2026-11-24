<?php

declare(strict_types=1);

namespace core\setting\infrastructure\persistence;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property int $user_id
 * @property string $title
 */
final class DeviceAR extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%device}}';
    }
}
