import AdminAuthLayout from './AdminAuthLayout';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function ConfirmPassword() {
    const {
        props: { errors = {} },
    } = usePage();

    const [password, setPassword] = useState('');

    const csrfToken =
        typeof document !== 'undefined'
            ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
            : '';

    return (
        <AdminAuthLayout
            pageTitle="Confirm Password"
            heading="Confirm your password"
            subheading="This is a secure area. Please confirm your password to continue."
        >
            <form method="POST" action={route('password.confirm')}>
                {csrfToken && <input type="hidden" name="_token" value={csrfToken} />}
                <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                        Password <span className="text-danger">*</span>
                    </label>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                    />
                    {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
                </div>

                <div className="d-grid">
                    <button className="btn btn-primary fw-semibold py-2">
                        Confirm
                    </button>
                </div>
            </form>
        </AdminAuthLayout>
    );
}
