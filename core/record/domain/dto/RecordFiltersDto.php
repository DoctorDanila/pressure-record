<?php

declare(strict_types=1);

namespace core\record\domain\dto;

final class RecordFiltersDto
{
    public function __construct(
        public readonly ?string $from   = null,
        public readonly ?string $to     = null,
        public readonly ?string $slot   = null,
        public readonly ?bool $planned  = null,
        public readonly int $limit      = 100,
        public readonly int $offset     = 0,
    ) {
    }
}
