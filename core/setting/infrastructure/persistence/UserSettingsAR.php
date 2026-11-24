<?php

declare(strict_types=1);

namespace core\setting\infrastructure\persistence;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property int $user_id
 */
final class UserSettingsAR extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%user_setting}}';
    }
}
