import { Link } from '@inertiajs/react';
import { Head } from '@inertiajs/react';

// Lightweight breadcrumb header adapted from the admin template
const PageBreadcrumb = ({ title, subtitle }) => {
    return (
        <>
            <Head title={title} />
            <div className="page-title-head d-flex align-items-center justify-content-between mb-3">
                <div className="flex-grow-1">
                    <h4 className="fs-sm text-uppercase fw-bold m-0">{title}</h4>
                </div>
                <div className="text-end">
                    <ol className="breadcrumb m-0 py-0">
                        <li className="breadcrumb-item">
                            <Link href={route('dashboard')}>Dashboard</Link>
                        </li>
                        {subtitle && (
                            <li className="breadcrumb-item">
                                <span>{subtitle}</span>
                            </li>
                        )}
                        <li className="breadcrumb-item active" aria-current="page">
                            {title}
                        </li>
                    </ol>
                </div>
            </div>
        </>
    );
};

export default PageBreadcrumb;

