import AdminAuthLayout from './AdminAuthLayout';
import { Link } from '@inertiajs/react';

export default function VerifyEmail({ status }) {
    const csrfToken =
        typeof document !== 'undefined'
            ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
            : '';

    return (
        <AdminAuthLayout
            pageTitle="Email Verification"
            heading="Verify your email"
            subheading="Please verify your email address to activate your account."
        >
            <div className="text-muted mb-3">
                We’ve sent a verification link to your email address. Click the link to finish setting up your account.
            </div>

            {status === 'verification-link-sent' && (
                <div className="alert alert-success py-2 mb-3" role="alert">
                    A new verification link has been sent to your email address.
                </div>
            )}

            <form method="POST" action={route('verification.send')}>
                {csrfToken && <input type="hidden" name="_token" value={csrfToken} />}
                <div className="d-flex justify-content-between align-items-center gap-2">
                    <button className="btn btn-primary fw-semibold py-2">
                        Resend Verification Email
                    </button>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="btn btn-light py-2"
                    >
                        Log Out
                    </Link>
                </div>
            </form>
        </AdminAuthLayout>
    );
}
