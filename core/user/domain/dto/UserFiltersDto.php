<?php

declare(strict_types=1);

namespace core\user\domain\dto;

class UserFiltersDto
{
    public function __construct(
        public ?string $ids             = null,
        public ?int $limit              = null,
        public ?int $offset             = null,
        public ?string $orderBy         = null,
        public ?string $email           = null,
        public ?bool $emailVerified     = null,
        public ?string $createdFrom     = null,
        public ?string $createdTo       = null,
        public ?string $updatedFrom     = null,
        public ?string $updatedTo       = null,
    ) {
    }
}
