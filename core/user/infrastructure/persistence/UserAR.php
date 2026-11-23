<?php

declare(strict_types=1);

namespace core\user\infrastructure\persistence;

use yii\db\ActiveRecord;
use yii\web\IdentityInterface;

/**
 * @property int $id
 * @property string $email
 * @property string $password_hash
 * @property string $token
 * @property bool $email_verified
 * @property string $created_at
 * @property string $updated_at
 */
final class UserAR extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%user}}';
    }
}
