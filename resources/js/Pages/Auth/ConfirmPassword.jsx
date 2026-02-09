import AdminAuthLayout from './AdminAuthLayout';
import { useForm } from '@inertiajs/react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AdminAuthLayout
            pageTitle="Confirm Password"
            heading="Confirm your password"
            subheading="This is a secure area. Please confirm your password to continue."
        >
            <form onSubmit={submit}>
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
                        onChange={(e) => setData('password', e.target.value)}
                        required
                        autoFocus
                    />
                    {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
                </div>

                <div className="d-grid">
                    <button className="btn btn-primary fw-semibold py-2" disabled={processing}>
                        Confirm
                    </button>
                </div>
            </form>
        </AdminAuthLayout>
    );
}
