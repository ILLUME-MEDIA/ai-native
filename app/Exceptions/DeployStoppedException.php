<?php

namespace App\Exceptions;

class DeployStoppedException extends \RuntimeException
{
    public function __construct()
    {
        parent::__construct('Deploy stopped by user.');
    }
}
