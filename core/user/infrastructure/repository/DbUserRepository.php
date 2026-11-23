<?php

declare(strict_types=1);

namespace core\user\infrastructure\repository;

use core\_internal\domain\valueObject\IdRange;
use core\user\domain\dto\UserFiltersDto;
use core\user\domain\entity\User;
use core\user\domain\repository\IUserRepository;
use core\user\domain\valueObject\Email;
use core\user\domain\valueObject\UserId;
use core\user\infrastructure\persistence\UserAR;
use DateTimeImmutable;
use Exception;
use RuntimeException;
use yii\db\Exception as DbException;
use yii\db\Query;

class DbUserRepository implements IUserRepository
{
    /**
     * @throws RuntimeException
     * @throws Exception
     */
    public function findById(UserId $id): ?User
    {
        $row = (new Query())
            ->from(UserAR::tableName())
            ->where(['id' => $id->value()])
            ->one();

        if (!$row) {
            throw new RuntimeException('User not found.', 404);
        }

        return $this->hydrate($row, true);
    }

    /**
     * @throws RuntimeException
     * @throws Exception
     */
    public function findByToken(string $token): ?User
    {
        $row = (new Query())
            ->from(UserAR::tableName())
            ->where(['token' => $token])
            ->one();

        if (!$row) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * @throws RuntimeException
     * @throws Exception
     */
    public function findByEmail(Email $email): ?User
    {
        $row = (new Query())
            ->from(UserAR::tableName())
            ->where(['email' => $email->value()])
            ->one();

        if (!$row) {
            throw new RuntimeException('User not found.', 404);
        }

        return $this->hydrate($row);
    }

    public function existsByEmail(Email $email, ?UserId $excludeUserId = null): bool
    {
        $query = (new Query())
            ->from(UserAR::tableName())
            ->where(['email' => $email->value()]);

        if ($excludeUserId !== null) {
            $query->andWhere(['!=', 'id', $excludeUserId->value()]);
        }

        return $query->exists();
    }

    public function findWithFilters(UserFiltersDto $filters): array
    {
        $query = $this->buildFilterQuery($filters);
        $query->orderBy($filters->orderBy ?? ['id' => SORT_ASC]);
        $query->limit($filters->limit)->offset($filters->offset);
        return array_map([$this, 'hydrate'], $query->all());
    }

    public function countWithFilters(UserFiltersDto $filters): int
    {
        $query = $this->buildFilterQuery($filters);
        return (int) $query->count();
    }

    /**
     * @throws RuntimeException
     * @throws DbException
     */
    public function save(User $user): void
    {
        $ar = $this->findOrCreateAR($user->getId());

        $ar->email          = $user->getEmail()->value();
        $ar->password_hash  = $user->getPasswordHash();
        $ar->email_verified = $user->isEmailVerified();
        $ar->token          = $user->getToken();

        if (!$ar->save()) {
            throw new RuntimeException(
                'Failed to save user: ' . json_encode($ar->getErrors(), JSON_UNESCAPED_UNICODE),
            );
        }

        if ($user->getId()->isNew()) {
            $user->setId(new UserId((int)$ar->id));
        }
    }

    public function delete(UserId $id): void
    {
        UserAR::deleteAll(['id' => $id->value()]);
    }

    private function buildFilterQuery(UserFiltersDto $filters): Query
    {
        $query = (new Query())->from(UserAR::tableName());
        if ($filters->ids !== null) {
            $ids = (new IdRange($filters->ids))->toArray();
            if (!empty($ids)) {
                $query->andWhere(['id' => $ids]);
            }
        }
        if ($filters->email !== null) {
            $query->andWhere(['email' => $filters->email]);
        }
        if ($filters->emailVerified !== null) {
            $query->andWhere(['email_verified' => $filters->emailVerified]);
        }

        // Date ranges
        if ($filters->createdFrom !== null) {
            $query->andWhere(['>=', 'created_at', $filters->createdFrom]);
        }
        if ($filters->createdTo !== null) {
            $query->andWhere(['<=', 'created_at', $filters->createdTo]);
        }
        if ($filters->updatedFrom !== null) {
            $query->andWhere(['>=', 'updated_at', $filters->updatedFrom]);
        }
        if ($filters->updatedTo !== null) {
            $query->andWhere(['<=', 'updated_at', $filters->updatedTo]);
        }

        return $query;
    }

    private function findOrCreateAR(UserId $id): UserAR
    {
        $ar = UserAR::findOne(['id' => $id->value()]);
        return $ar ?? new UserAR();
    }

    /**
     * @throws Exception
     */
    private function hydrate(array $row, bool $withRelations = false): User
    {
        $userId = new UserId((int)$row['id']);

        return new User(
            $userId,
            new Email($row['email']),
            $row['password_hash'],
            (bool)$row['email_verified'],
            $row['token'] ?? null,
            $row['created_at'] !== null ? new DateTimeImmutable($row['created_at']) : null,
            $row['updated_at'] !== null ? new DateTimeImmutable($row['updated_at']) : null,
        );
    }
}
