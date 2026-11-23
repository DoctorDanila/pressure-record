<?php

declare(strict_types=1);

namespace core\presentation\request;

use yii\base\Model;
use yii\web\UploadedFile;

class CreateUserRequest extends Model
{
    public ?string $email       = null;
    public ?string $password    = null;

    public function rules(): array
    {
        return [
            [['email', 'password',], 'required'],
            ['email', 'email'],
            ['email', 'filter', 'filter' => 'mb_strtolower'],
            ['password', 'string', 'min' => 6],
            ['password', 'match',
                'pattern' => '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/',
                'message' => 'Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.'
            ],
        ];
    }
}
