<?php

declare(strict_types=1);

namespace core\user\presentation\request;

use yii\base\Model;

class LoginRequest extends Model
{
    public ?string $email       = null;
    public ?string $password    = null;

    public function rules(): array
    {
        return [
            [['email', 'password'], 'required'],
            ['email', 'email'],
            ['email', 'filter', 'filter' => 'mb_strtolower'],
            ['password', 'string', 'min' => 1],
        ];
    }
}
