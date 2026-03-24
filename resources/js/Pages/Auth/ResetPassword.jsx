import AdminAuthLayout from './AdminAuthLayout';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function ResetPassword({ token, email }) {
    const {
        props: { errors = {} },
    } = usePage();

    const [formData, setFormData] = useState({
        email,
        password: '',
        password_confirmation: '',
    });

    const csrfToken =
        typeof document !== 'undefined'
            ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
            : '';

    return (
        <AdminAuthLayout
            pageTitle="Reset Password"
            heading="Set a new password"
            subheading="Choose a strong password to secure your account."
            footer={
                <p className="text-muted text-center mt-4 mb-0">
                    Back to{' '}
                    <Link href={route('login')} className="text-decoration-underline link-offset-3 fw-semibold">
                        Sign in
                    </Link>
                </p>
            }
        >
            <form method="POST" action={route('password.store')}>
                {csrfToken && <input type="hidden" name="_token" value={csrfToken} />}
                <input type="hidden" name="token" value={token} />
                <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                        Email <span className="text-danger">*</span>
                    </label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        value={formData.email}
                        autoComplete="username"
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                </div>

                <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                        New Password <span className="text-danger">*</span>
                    </label>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        value={formData.password}
                        autoComplete="new-password"
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        autoFocus
                    />
                    {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
                </div>

                <div className="mb-3">
                    <label htmlFor="password_confirmation" className="form-label">
                        Confirm Password <span className="text-danger">*</span>
                    </label>
                    <input
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        className={`form-control ${errors.password_confirmation ? 'is-invalid' : ''}`}
                        value={formData.password_confirmation}
                        autoComplete="new-password"
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                password_confirmation: e.target.value,
                            })
                        }
                        required
                    />
                    {errors.password_confirmation && (
                        <div className="invalid-feedback d-block">{errors.password_confirmation}</div>
                    )}
                </div>

                <div className="d-grid">
                    <button className="btn btn-primary fw-semibold py-2">
                        Reset Password
                    </button>
                </div>
            </form>
        </AdminAuthLayout>
    );
}
