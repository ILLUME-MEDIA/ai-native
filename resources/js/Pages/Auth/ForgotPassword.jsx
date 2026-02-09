import AdminAuthLayout from './AdminAuthLayout';
import { Link, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <AdminAuthLayout
            pageTitle="Forgot Password"
            heading="Reset your password"
            subheading="Enter your email and we’ll send you a reset link."
            footer={
                <p className="text-muted text-center mt-4 mb-0">
                    Remembered your password?{' '}
                    <Link href={route('login')} className="text-decoration-underline link-offset-3 fw-semibold">
                        Sign in
                    </Link>
                </p>
            }
        >
            {status && (
                <div className="alert alert-success py-2 mb-3" role="alert">
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                        Email <span className="text-danger">*</span>
                    </label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoFocus
                    />
                    {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
                </div>

                <div className="d-grid">
                    <button className="btn btn-primary fw-semibold py-2" disabled={processing}>
                        Email Password Reset Link
                    </button>
                </div>
            </form>
        </AdminAuthLayout>
    );
}
