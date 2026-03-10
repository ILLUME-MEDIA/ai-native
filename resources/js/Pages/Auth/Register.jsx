import AdminAuthLayout from './AdminAuthLayout';
import { Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset, transform } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    // Include _token in the POST body as a fallback for cPanel/Apache setups that
    // strip non-standard request headers (X-CSRF-TOKEN / X-XSRF-TOKEN).
    // Laravel checks $request->input('_token') first, before any header.
    transform((d) => ({
        ...d,
        _token: document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
    }));

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AdminAuthLayout
            pageTitle="Register"
            heading="Create your account"
            subheading="Join us today. Fill in your details to get started."
            footer={
                <p className="text-muted text-center mt-4 mb-0">
                    Already have an account?{' '}
                    <Link
                        href={route('login')}
                        className="text-decoration-underline link-offset-3 fw-semibold"
                    >
                        Sign in
                    </Link>
                </p>
            }
        >
            <form onSubmit={submit}>
                <div className="mb-3">
                    <label htmlFor="name" className="form-label">
                        Name <span className="text-danger">*</span>
                    </label>
                    <input
                        id="name"
                        name="name"
                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                        value={data.name}
                        autoComplete="name"
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        autoFocus
                    />
                    {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
                </div>

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
                        Password <span className="text-danger">*</span>
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
                        Create Account
                    </button>
                </div>
            </form>
        </AdminAuthLayout>
    );
}
