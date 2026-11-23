<?php

/** @var int $userId */
/** @var string $token */
/** @var string $appName */

use yii\helpers\Url;

$verifyUrl = Url::to(['/user/user/verify-email', 'id' => $userId, 'token' => $token], true);
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Подтверждение email</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
    <table style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <tr>
            <td style="text-align: center;">
                <h1 style="color: #2a6496;"><?= htmlspecialchars($appName ?? 'Pressure Record', ENT_QUOTES, 'UTF-8') ?></h1>
                <h2 style="color: #555;">Подтверждение email</h2>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px 0;">
                <p>Здравствуйте!</p>
                <p>Благодарим вас за регистрацию. Пожалуйста, подтвердите ваш email, перейдя по ссылке ниже:</p>
                <p style="text-align: center; padding: 20px 0;">
                    <a href="<?= htmlspecialchars($verifyUrl, ENT_QUOTES, 'UTF-8') ?>"
                       style="display: inline-block; padding: 12px 30px; background-color: #2a6496; color: #fff;
                              text-decoration: none; border-radius: 5px; font-size: 16px;">
                        Подтвердить email
                    </a>
                </p>
                <p>Если кнопка не отображается, скопируйте и вставьте в браузер следующую ссылку:</p>
                <p style="word-break: break-all; color: #2a6496;"><?= htmlspecialchars($verifyUrl, ENT_QUOTES, 'UTF-8') ?></p>
                <p>Ссылка действительна в течение 24 часов.</p>
            </td>
        </tr>
        <tr>
            <td style="border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #999;">
                <p>Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.</p>
            </td>
        </tr>
    </table>
</body>
</html>
