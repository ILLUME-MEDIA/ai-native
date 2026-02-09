import authimg from '@admin/assets/images/auth-card-bg.svg';
import auth from '@admin/assets/images/auth.jpg';
import logodark from '@admin/assets/images/logo-black.png';
import logolight from '@admin/assets/images/logo.png';
import { currentYear, META_DATA } from '@admin/config/constants';
import { Link } from 'react-router';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import Forms from './components/Form';
const Page = () => {
  return <div className="auth-box p-0 w-100">
      <Row className="w-100 g-0">
        <Col md="auto">
          <Card className="card auth-box-form border-0 mb-0">
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
                <p className="text-muted text-center auth-sub-text mx-auto" />

                <div className="text-center">
                  <h4 className="fw-bold text-dark">Let’s get you started 👋</h4>
                  <p className="text-muted w-lg-75 mx-auto">Create your account by entering the form below.</p>
                </div>

                <div className="row text-muted g-2">
                  <div className="col-md-6">
                    <a href="#!" className="btn btn-default w-100">
                      Sign up with
                      <svg xmlns="http://www.w3.org/2000/svg" className="ms-1" width="13.68px" height="14px" viewBox="0 0 256 262">
                        <path fill="#4285f4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" />
                        <path fill="#34a853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" />
                        <path fill="#fbbc05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z" />
                        <path fill="#eb4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" />
                      </svg>
                    </a>
                  </div>
                  <div className="col-md-6">
                    <a href="#!" className="btn btn-default w-100">
                      Sign up with
                      <svg xmlns="http://www.w3.org/2000/svg" className="ms-1" width="14px" height="14px" viewBox="0 0 64 64">
                        <path fill="currentColor" d="M32 0C14 0 0 14 0 32c0 21 19 30 22 30c2 0 2-1 2-2v-5c-7 2-10-2-11-5c0 0 0-1-2-3c-1-1-5-3-1-3c3 0 5 4 5 4c3 4 7 3 9 2c0-2 2-4 2-4c-8-1-14-4-14-15q0-6 3-9s-2-4 0-9c0 0 5 0 9 4c3-2 13-2 16 0c4-4 9-4 9-4c2 7 0 9 0 9q3 3 3 9c0 11-7 14-14 15c1 1 2 3 2 6v8c0 1 0 2 2 2c3 0 22-9 22-30C64 14 50 0 32 0" />
                      </svg>
                    </a>
                  </div>
                </div>

                <p className="text-center text-muted my-3 auth-line">
                  <span> Continue with Email </span>
                </p>

                <Forms />
              </div>
              <p className="text-muted text-center mt-4 mb-0">
                Already have an account?&nbsp;
                <Link to="/auth/split/sign-in" className="text-decoration-underline link-offset-3 fw-semibold">
                  Login
                </Link>
              </p>
              <p className="text-center text-muted mt-auto mb-0">
                © {currentYear} {META_DATA.name} — by
                <span className="fw-bold">{META_DATA.author}</span>
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