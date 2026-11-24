<?php

declare(strict_types=1);

namespace core\setting\domain\dto;

use core\setting\domain\entity\UserSettings;
use JsonSerializable;

final class SettingsDto implements JsonSerializable
{
    /**
     * @param array<int, array<string, mixed>> $devices
     */
    public function __construct(
        private readonly UserSettings $settings,
        private readonly array $devices,
    ) {
    }

    public function jsonSerialize(): array
    {
        return [
            'config'    => $this->settings->toArray(),
            'devices'   => $this->devices,
        ];
    }
}
