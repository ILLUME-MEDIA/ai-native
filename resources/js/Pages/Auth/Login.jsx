import AdminAuthLayout from './AdminAuthLayout';
import { Link, useForm } from '@inertiajs/react';
import { Button, Col, Row } from 'react-bootstrap';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        
        // Cleanup any Bootstrap modals before login redirect
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';

        post(route('login'), {
            onFinish: () => reset('password'),
            onSuccess: () => {
                // Ensure modals are cleaned up after successful login
                setTimeout(() => {
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(backdrop => backdrop.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.paddingRight = '';
                    document.body.style.overflow = '';
                }, 100);
            },
        });
    };

    const socialContent = (
        <Row className="text-muted g-2">
            <Col lg={6}>
                <Button variant="default" className="w-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="me-1" width="13.68px" height="14px" viewBox="0 0 256 262">
                        <path fill="#4285f4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" />
                        <path fill="#34a853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" />
                        <path fill="#fbbc05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z" />
                        <path fill="#eb4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" />
                    </svg>
                    Sign in with Google
                </Button>
            </Col>
            <Col lg={6}>
                <Button variant="default" className="w-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="me-1" width="14px" height="14px" viewBox="0 0 64 64">
                        <path fill="currentColor" d="M32 0C14 0 0 14 0 32c0 21 19 30 22 30c2 0 2-1 2-2v-5c-7 2-10-2-11-5c0 0 0-1-2-3c-1-1-5-3-1-3c3 0 5 4 5 4c3 4 7 3 9 2c0-2 2-4 2-4c-8-1-14-4-14-15q0-6 3-9s-2-4 0-9c0 0 5 0 9 4c3-2 13-2 16 0c4-4 9-4 9-4c2 7 0 9 0 9q3 3 3 9c0 11-7 14-14 15c1 1 2 3 2 6v8c0 1 0 2 2 2c3 0 22-9 22-30C64 14 50 0 32 0" />
                    </svg>
                    Sign in with Github
                </Button>
            </Col>
        </Row>
    );

    return (
        <AdminAuthLayout
            pageTitle="Log in"
            heading="Great to see you here 👋"
            subheading="Let’s get you signed in. Enter your email and password to continue."
            showSocial
            socialContent={socialContent}
            footer={
                <p className="text-muted text-center mt-4 mb-0">
                    New here?{' '}
                    <Link
                        href={route('register')}
                        className="text-decoration-underline link-offset-3 fw-semibold"
                    >
                        Create an account
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
                        Email address <span className="text-danger">*</span>
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
                        autoFocus
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
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="form-check">
                        <input
                            className="form-check-input form-check-input-light fs-14"
                            type="checkbox"
                            id="rememberMe"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="rememberMe">
                            Keep me signed in
                        </label>
                    </div>
                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-decoration-underline link-offset-3 text-muted"
                        >
                            Forgot Password?
                        </Link>
                    )}
                </div>

                <div className="d-grid">
                    <button className="btn btn-primary fw-semibold py-2" disabled={processing}>
                        Sign In
                    </button>
                </div>
            </form>
        </AdminAuthLayout>
    );
}
