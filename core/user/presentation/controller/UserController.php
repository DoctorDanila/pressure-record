<?php

declare(strict_types=1);

namespace core\user\presentation\controller;

use core\_internal\application\dto\CollectionDto;
use core\_internal\application\dto\ItemDto;
use core\_internal\application\dto\SuccessDto;
use core\_internal\presentation\controller\BaseController;
use core\presentation\request\CreateUserRequest;
use core\presentation\request\LoginRequest;
use core\presentation\request\UpdateUserEmailRequest;
use core\presentation\request\UpdateUserPasswordRequest;
use core\user\application\service\AuthService;
use core\user\application\service\UserService;
use core\user\domain\dto\UserFiltersDto;
use core\user\domain\valueObject\UserId;
use Exception;
use RuntimeException;
use Yii;
use yii\base\InvalidConfigException;
use yii\di\NotInstantiableException;
use yii\web\Cookie;
use yii\web\Response;

class UserController extends BaseController
{
    private const AUTH_COOKIE_NAME = 'auth_token';
    private const AUTH_COOKIE_DURATION = 604800; // 1 week

    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        // Убираем CSRF-валидацию для API эндпоинтов
        $behaviors['contentNegotiator']['formats'] = [
            'application/json' => Response::FORMAT_JSON,
        ];
        return $behaviors;
    }

    # -------------------- User CRUD --------------------

    /**
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionDelete(int $id): SuccessDto
    {
        $service = Yii::$container->get(UserService::class);
        $service->deleteWithUserId(new UserId($id));
        return $this->success(null, 'User deleted');
    }

    /**
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionView(int $id): ItemDto
    {
        $service = Yii::$container->get(UserService::class);
        $dto = $service->getUserWithId(new UserId($id));
        return $this->item($dto);
    }

    /**
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionIndex(): CollectionDto
    {
        $params = Yii::$app->request->get();
        $filters = new UserFiltersDto(
            ids: $params['ids'] ?? null,
            limit: $this->getLimit(),
            offset: isset($params['offset']) ? (int)$params['offset'] : null,
            orderBy: $params['orderBy'] ?? null,
            email: $params['email'] ?? null,
            emailVerified: isset($params['emailVerified']) ? filter_var($params['emailVerified'], FILTER_VALIDATE_BOOLEAN) : null,
            createdFrom: $params['createdFrom'] ?? null,
            createdTo: $params['createdTo'] ?? null,
            updatedFrom: $params['updatedFrom'] ?? null,
            updatedTo: $params['updatedTo'] ?? null,
        );

        $service = Yii::$container->get(UserService::class);
        $items = $service->getUserWithFilters($filters);

        $total = $service->getUserCountWithFilters($filters);

        return $this->collection(
            $items,
            $total,
            $filters->offset ? (int)($filters->offset / ($filters->limit ?: 1)) + 1 : 1,
            $filters->limit,
        );
    }

    /**
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionEmailChange(int $id): ItemDto
    {
        $request = new UpdateUserEmailRequest();
        $request->load(Yii::$app->request->post(), '');
        if (!$request->validate()) {
            throw new RuntimeException('Validation failed: ' . json_encode($request->getErrors(), JSON_UNESCAPED_UNICODE), 400);
        }

        $service = Yii::$container->get(UserService::class);
        $userDto = $service->emailChange(new UserId($id), $request);
        return $this->item($userDto);
    }

    /**
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionPasswordChange(int $id): SuccessDto
    {
        $request = new UpdateUserPasswordRequest();
        $request->load(Yii::$app->request->post(), '');
        if (!$request->validate()) {
            throw new RuntimeException('Validation failed: ' . json_encode($request->getErrors(), JSON_UNESCAPED_UNICODE), 400);
        }

        $service = Yii::$container->get(UserService::class);
        $service->passwordChange(new UserId($id), $request);
        return $this->success();
    }

    # -------------------- Auth actions --------------------

    /**
     * Регистрация нового пользователя.
     * POST /register
     *
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionRegister(): ItemDto
    {
        $request = new CreateUserRequest();
        $request->load(Yii::$app->request->post(), '');
        if (!$request->validate()) {
            throw new RuntimeException('Validation failed: ' . json_encode($request->getErrors(), JSON_UNESCAPED_UNICODE), 400);
        }

        /** @var AuthService $authService */
        $authService = Yii::$container->get(AuthService::class);
        $userDto = $authService->register($request);

        return $this->item($userDto);
    }

    /**
     * Подтверждение email.
     * GET /verify-email?id=X&token=Y
     *
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionVerifyEmail(int $id, string $token): SuccessDto
    {
        /** @var AuthService $authService */
        $authService = Yii::$container->get(AuthService::class);
        $authService->verifyEmail($id, $token);

        return $this->success(null, 'Email verified successfully');
    }

    /**
     * Вход пользователя.
     * POST /login
     *
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     * @throws Exception
     */
    public function actionLogin(): ItemDto
    {
        $request = new LoginRequest();
        $request->load(Yii::$app->request->post(), '');
        if (!$request->validate()) {
            throw new RuntimeException('Validation failed: ' . json_encode($request->getErrors(), JSON_UNESCAPED_UNICODE), 400);
        }

        /** @var AuthService $authService */
        $authService = Yii::$container->get(AuthService::class);
        $result = $authService->login($request->email, $request->password);

        $cookie = new Cookie([
            'name'      => self::AUTH_COOKIE_NAME,
            'value'     => $result['token'],
            'expire'    => time() + self::AUTH_COOKIE_DURATION,
            'httpOnly'  => true,
            'secure'    => ($_ENV['APP_ENV'] ?? 'dev') === 'prod',
        ]);
        Yii::$app->response->cookies->add($cookie);

        return $this->item($result['user']);
    }

    /**
     * Выход пользователя.
     * POST /logout
     *
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionLogout(): SuccessDto
    {
        $userId = $this->getUserId();
        if ($userId !== null) {
            /** @var AuthService $authService */
            $authService = Yii::$container->get(AuthService::class);
            $authService->logout(new UserId((int)$userId));
        }

        Yii::$app->response->cookies->remove(self::AUTH_COOKIE_NAME);

        return $this->success(null, 'Logged out successfully');
    }

    /**
     * Профиль текущего пользователя.
     * GET /profile
     *
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionProfile(): ItemDto
    {
        $userId = $this->getUserId();
        if ($userId === null) {
            throw new RuntimeException('Unauthorized', 401);
        }

        $service = Yii::$container->get(UserService::class);
        $dto = $service->getUserWithId(new UserId((int)$userId));
        return $this->item($dto);
    }
}
