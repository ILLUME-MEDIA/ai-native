<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Release the PHP session file lock before the controller runs.
 *
 * PHP's file-based session driver holds an exclusive lock for the entire
 * request lifetime. SSE streams keep connections open indefinitely, which
 * blocks every other request from the same browser session (including page
 * refreshes) until the stream ends.
 *
 * Calling session()->save() here releases the lock immediately after auth
 * middleware has finished — before any controller or SSE stream starts.
 * Controllers should not write to the session after this point (API
 * controllers typically don't).
 */
class ReleaseSession
{
    public function handle(Request $request, Closure $next): Response
    {
        // Save (and unlock) the session before the controller runs.
        // Auth middleware has already populated auth()->user() at this point,
        // so releasing the lock here is safe for all API routes.
        if (session()->isStarted()) {
            session()->save();
        }

        return $next($request);
    }
}
