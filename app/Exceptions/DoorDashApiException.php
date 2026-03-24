<?php

namespace App\Exceptions;

class DoorDashApiException extends \RuntimeException
{
    public function __construct(
        string $message,
        private readonly array $rawError = [],
        int $code = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }

    /** Full raw DoorDash error body (decoded JSON). */
    public function getRawError(): array
    {
        return $this->rawError;
    }

    /** Field-level validation errors, e.g. [{"field":"pickup_phone_number","error":"..."}] */
    public function getFieldErrors(): array
    {
        return $this->rawError['field_errors'] ?? $this->rawError['errors'] ?? [];
    }

    public function getDoorDashCode(): string
    {
        return (string) ($this->rawError['code'] ?? '');
    }
}
