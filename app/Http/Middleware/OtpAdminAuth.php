<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class OtpAdminAuth
{
    /**
     * Protect OTP admin management endpoints with a simple API key.
     * Set OTP_ADMIN_KEY in your .env (any random string).
     * Pass it as header:  X-OTP-Admin-Key: <key>
     * Or query param:     ?otp_admin_key=<key>
     * If OTP_ADMIN_KEY is empty, admin routes are open (useful for development).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $configuredKey = env('OTP_ADMIN_KEY', '');

        // If no key is configured — allow (dev mode)
        if (empty($configuredKey)) {
            return $next($request);
        }

        $providedKey = $request->header('X-OTP-Admin-Key')
            ?? $request->query('otp_admin_key', '');

        if (! hash_equals($configuredKey, (string) $providedKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Provide a valid X-OTP-Admin-Key header.',
            ], 401);
        }

        return $next($request);
    }
}
