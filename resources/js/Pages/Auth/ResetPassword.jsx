import AdminAuthLayout from './AdminAuthLayout';
import { Link, useForm } from '@inertiajs/react';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

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
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
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
                        value={data.password}
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
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
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                    {errors.password_confirmation && (
                        <div className="invalid-feedback d-block">{errors.password_confirmation}</div>
                    )}
                </div>

                <div className="d-grid">
                    <button className="btn btn-primary fw-semibold py-2" disabled={processing}>
                        Reset Password
                    </button>
                </div>
            </form>
        </AdminAuthLayout>
    );
}
