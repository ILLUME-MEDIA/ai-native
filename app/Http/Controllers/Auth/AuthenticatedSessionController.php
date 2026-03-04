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
     * If the user is already authenticated, redirect them straight to the
     * admin dashboard instead of rendering the login page inside the
     * auth layout (which looks like a modal/overlay).
     */
    public function create(): Response|RedirectResponse|HttpResponse
    {
        if (Auth::check()) {
            return Inertia::location('/admin/dashboard/ecommerce');
        }

        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): Response|RedirectResponse|HttpResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $redirectUrl = $request->session()->pull('url.intended', '/admin/dashboard/ecommerce');

        // Inertia::location() forces a full browser page reload instead of an XHR redirect.
        // This ensures a fresh session cookie + CSRF token after login on cPanel/proxy setups.
        return Inertia::location($redirectUrl);
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
