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
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $redirectUrl = $request->session()->pull('url.intended', '/admin/dashboard/ecommerce');

        // Explicitly flush the session to the store before sending the redirect.
        // On cPanel/Apache, the response can be sent before PHP's shutdown handlers
        // write the session, so the next request sees no authenticated session.
        $request->session()->save();

        // Return a standard PHP 302 redirect.
        // Login.jsx submits via a programmatic native form (not Inertia XHR), so the
        // browser follows this redirect natively — session cookie is guaranteed to be
        // sent on the next GET, regardless of cPanel/Apache proxy configuration.
        return redirect($redirectUrl);
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
