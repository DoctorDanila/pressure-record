<?php

declare(strict_types=1);

namespace core\user\presentation\request;

use yii\base\Model;

class UpdateUserPasswordRequest extends Model
{
    public ?string $oldPassword = null;
    public ?string $newPassword = null;

    public function rules(): array
    {
        return [
            [['oldPassword', 'newPassword'], 'required'],
            ['newPassword', 'string', 'min' => 6],
            ['newPassword', 'match',
                'pattern' => '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/',
                'message' => 'Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.',
            ],
        ];
    }
}