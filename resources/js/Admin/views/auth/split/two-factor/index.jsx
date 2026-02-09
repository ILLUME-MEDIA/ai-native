import authimg from '@admin/assets/images/auth-card-bg.svg';
import auth from '@admin/assets/images/auth.jpg';
import logodark from '@admin/assets/images/logo-black.png';
import logolight from '@admin/assets/images/logo.png';
import { currentYear, META_DATA } from '@admin/config/constants';
import { Link } from 'react-router';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import Forms from './components/Forms';
const Page = () => {
  return <div className="auth-box p-0 w-100">
      <Row className="w-100 g-0">
        <Col md="auto">
          <Card className="auth-box-form border-0 mb-0">
            <div className="position-absolute top-0 end-0" style={{
            width: '180px'
          }}>
              <img src={authimg} className="auth-card-bg-img" alt="auth-card-bg" />
            </div>
            <CardBody className="min-vh-100 position-relative d-flex flex-column justify-content-center">
              <div className="auth-brand mb-0 text-center">
                <Link to="/" className="logo-dark">
                  <img src={logodark} alt="dark logo" width={103} height={26} className="img-fluid" />
                </Link>
                <Link to="/" className="logo-light">
                  <img src={logolight} alt="logo" width={103} height={26} className="img-fluid" />
                </Link>
              </div>
              <div className="mt-auto">
                <p className="text-muted text-center auth-sub-text mx-auto">We&apos;ve emailed you a 6-digit verification code we sent to</p>

                <div className="text-center mb-4">
                  <div className="fw-bold fs-3">******6789</div>
                </div>
                <Forms />
              </div>
              <p className="mt-4 text-muted text-center mb-4">
                Don&apos;t have a code?&nbsp;
                <Link to="" className="text-decoration-underline link-offset-2 fw-semibold">
                  Resend
                </Link>
                &nbsp;or&nbsp;
                <Link to="" className="text-decoration-underline link-offset-2 fw-semibold">
                  Call Us
                </Link>
              </p>
              <p className="text-muted text-center mt-4 mb-0">
                Return to&nbsp;
                <Link to="/auth/split/sign-in" className="text-decoration-underline link-offset-3 fw-semibold">
                  Sign in
                </Link>
              </p>
              <p className="text-center text-muted mt-auto mb-0">
                © {currentYear} {META_DATA.name} — by <span className="fw-bold">{META_DATA.author}</span>
              </p>
            </CardBody>
          </Card>
        </Col>
        <Col>
          <div className="h-100 position-relative card-side-img rounded-0 overflow-hidden" style={{
          backgroundImage: `url(${auth})`
        }}>
            <div className="p-4 card-img-overlay auth-overlay d-flex align-items-end justify-content-center" />
          </div>
        </Col>
      </Row>
    </div>;
};
export default Page;