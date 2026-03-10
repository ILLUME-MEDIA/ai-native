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
            // Use redirectTo prop (same pattern as store()) instead of
            // Inertia::location() to avoid Apache stripping X-Inertia-Location.
            return Inertia::render('Auth/Login', [
                'canResetPassword' => Route::has('password.request'),
                'status'           => session('status'),
                'redirectTo'       => '/admin/dashboard/ecommerce',
            ]);
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

        // Re-render the Login page with a `redirectTo` prop.
        // Login.jsx detects this and does window.location.href (full browser reload).
        //
        // We avoid Inertia::location() (409 + X-Inertia-Location header) because
        // cPanel/Apache strips non-standard response headers, causing the redirect
        // to silently fail on production servers.
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status'           => session('status'),
            'redirectTo'       => $redirectUrl,
        ]);
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
