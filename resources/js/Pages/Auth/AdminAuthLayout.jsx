import authCard from '@admin/assets/images/auth-card-bg.svg';
import logoBlack from '@admin/assets/images/logo-black.png';
import logo from '@admin/assets/images/logo.png';
import { META_DATA, currentYear } from '@admin/config/constants';
import { Head, Link } from '@inertiajs/react';
import { Card, Col, Container, Row } from 'react-bootstrap';
import '@admin/assets/scss/app.scss';

const AdminAuthLayout = ({
    pageTitle,
    heading,
    subheading,
    children,
    footer,
    showSocial = false,
    socialContent,
}) => {
    return (
        <>
            <Head title={pageTitle} />

            <div className="position-absolute top-0 end-0">
                <img src={authCard} className="auth-card-bg-img" alt="auth-card-bg" />
            </div>
            <div className="position-absolute bottom-0 start-0" style={{ transform: 'rotate(180deg)' }}>
                <img src={authCard} className="auth-card-bg-img" alt="auth-card-bg" />
            </div>

            <div className="auth-box overflow-hidden align-items-center d-flex">
                <Container>
                    <Row className="justify-content-center">
                        <Col xxl={5} md={6} sm={8}>
                            <Card className="p-4 auth-box-form">
                                <div className="auth-brand text-center mb-2">
                                    <Link href="/" className="logo-dark">
                                        <img src={logoBlack} alt="dark logo" width={103} height={26} className="img-fluid" />
                                    </Link>
                                    <Link href="/" className="logo-light">
                                        <img src={logo} alt="logo" width={103} height={26} className="img-fluid" />
                                    </Link>
                                    {(heading || subheading) && (
                                        <div>
                                            {heading && <h4 className="fw-bold text-dark mt-3">{heading}</h4>}
                                            {subheading && (
                                                <p className="text-muted w-lg-75 mx-auto auth-sub-text">{subheading}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {showSocial && socialContent}

                                {showSocial && (
                                    <p className="text-center text-muted my-3 auth-line">
                                        <span> Continue with Email </span>
                                    </p>
                                )}

                                {children}

                                {footer}
                            </Card>
                            <p className="text-center text-muted mt-4 mb-0">
                                © {currentYear} {META_DATA.name} — by{' '}
                                <span className="fw-bold">{META_DATA.author}</span>
                            </p>
                        </Col>
                    </Row>
                </Container>
            </div>
        </>
    );
};

export default AdminAuthLayout;
