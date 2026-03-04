<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
    public function create(): Response|RedirectResponse
    {
        if (Auth::check()) {
            return Inertia::location('/admin/dashboard/ecommerce');
        }

        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
            'csrf_token' => csrf_token(),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        // Always redirect to admin dashboard - frontend will handle full page reload
        $redirectUrl = $request->session()->pull('url.intended', '/admin/dashboard/ecommerce');
        
        // For Inertia requests, return redirect header so frontend can do full page reload
        if ($request->header('X-Inertia')) {
            return redirect($redirectUrl);
        }
        
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
