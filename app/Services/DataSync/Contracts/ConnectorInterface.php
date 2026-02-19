<?php

namespace App\Services\DataSync\Contracts;

interface ConnectorInterface
{
    /**
     * Return an iterable of raw business rows (array or object).
     */
    public function businesses(): iterable;

    /**
     * Return approximate total count (for logging/display).
     */
    public function count(): int;
}
