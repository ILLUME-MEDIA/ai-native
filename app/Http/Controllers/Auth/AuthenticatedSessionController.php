<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     *
     * If the user is already authenticated, send them straight to the admin
     * dashboard via a plain PHP redirect so the browser follows it natively
     * (same pattern as store() — no Inertia::location() header tricks).
     */
    public function create(): Response|RedirectResponse|HttpResponse
    {
        if (Auth::check()) {
            return redirect('/admin/dashboard/ecommerce');
        }

        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): HttpResponse|RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $redirectUrl = $request->session()->pull('url.intended', '/admin/dashboard/ecommerce');

        // Explicitly flush the session to the store before sending the redirect.
        // On cPanel/Apache, the response can be sent before PHP's shutdown handlers
        // write the session, so the next request sees no authenticated session.
        $request->session()->save();

        // Debug logging
        \Log::info('User logged in, Session ID: ' . $request->session()->getId() . ', Redirect to: ' . $redirectUrl);

        // On cPanel/Apache, a 302 redirect response can have its Set-Cookie header
        // stripped by ModSecurity or Apache rewrite rules before it reaches the browser.
        // By returning a 200 response with a delayed JS redirect, the cookie is fully
        // committed to the browser's cookie store BEFORE the navigation fires.
        // setTimeout(fn, 200) ensures the cookie write completes before the GET request.
        $url = e($redirectUrl);
        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
</head>
<body>
    <script>
        setTimeout(function() {
            window.location.replace('{$url}');
        }, 200);
    </script>
</body>
</html>
HTML;
        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
