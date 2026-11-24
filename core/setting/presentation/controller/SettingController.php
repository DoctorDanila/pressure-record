<?php

declare(strict_types=1);

namespace core\setting\presentation\controller;

use core\_internal\application\dto\ItemDto;
use core\_internal\application\dto\SuccessDto;
use core\_internal\presentation\controller\BaseController;
use core\setting\application\service\SettingsService;
use RuntimeException;
use Yii;
use yii\base\InvalidConfigException;
use yii\di\NotInstantiableException;
use yii\web\Response;

final class SettingController extends BaseController
{
    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats'] = ['application/json' => Response::FORMAT_JSON];
        return $behaviors;
    }

    /**
     * GET /api/settings
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionIndex(): ItemDto
    {
        return $this->item($this->service()->getForUser($this->requiredUserId()));
    }

    /**
     * PUT /api/settings
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionUpdate(): ItemDto
    {
        $payload = Yii::$app->request->getBodyParams();
        return $this->item($this->service()->updateForUser($this->requiredUserId(), $payload));
    }

    /**
     * POST /api/devices
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionCreateDevice(): ItemDto
    {
        return $this->item($this->service()->createDevice(
            $this->requiredUserId(),
            Yii::$app->request->getBodyParams(),
        ));
    }

    /**
     * DELETE /api/devices/{id}
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionDeleteDevice(int $id): SuccessDto
    {
        $this->service()->deleteDevice($this->requiredUserId(), $id);
        return $this->success(null, 'Device deleted');
    }

    private function requiredUserId(): int
    {
        $id = $this->getUserId();
        if ($id === null) {
            throw new RuntimeException('Unauthorized', 401);
        }
        return (int)$id;
    }

    /**
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    private function service(): SettingsService
    {
        return Yii::$container->get(SettingsService::class);
    }
}
