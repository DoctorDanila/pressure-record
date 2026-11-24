<?php

declare(strict_types=1);

namespace core\user\presentation\request;

use yii\base\Model;
use yii\web\UploadedFile;

class UpdateUserEmailRequest extends Model
{
    public ?string $email = null;

    public function rules(): array
    {
        return [
            ['email', 'email'],
            ['email', 'filter', 'filter' => 'mb_strtolower'],
        ];
    }
}
