<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Symfony\Component\HttpFoundation\Response;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Handle the request and ensure X-Inertia response header is present on
     * 2xx responses. On cPanel/Apache, the root .htaccess internal rewrite
     * strips the X-Inertia request header; we restore it via the HTTP_X_INERTIA
     * env var so PHP detects the Inertia request correctly. This override then
     * guarantees the X-Inertia:true response header is set only for success
     * responses — never for 4xx errors like 419/422 that would confuse Inertia.js.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = parent::handle($request, $next);

        if ($request->hasHeader('X-Inertia')) {
            $status = $response->getStatusCode();
            if ($status >= 200 && $status < 300) {
                $response->headers->set('X-Inertia', 'true');
            }
        }

        return $response;
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            // Explicitly share CSRF token with frontend
            'csrf_token' => $request->session()->token(),
        ];
    }
}
