<?php

declare(strict_types=1);

namespace core\record\domain\dto;

use JsonSerializable;

final class RecordSeriesDto implements JsonSerializable
{
    /**
     * @param array<string, mixed> $data
     */
    public function __construct(private readonly array $data)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return $this->data;
    }
}
