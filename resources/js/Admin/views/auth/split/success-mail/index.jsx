import authimg from '@admin/assets/images/auth-card-bg.svg';
import auth from '@admin/assets/images/auth.jpg';
import icon from '@admin/assets/images/checkmark.png';
import logodark from '@admin/assets/images/logo-black.png';
import logolight from '@admin/assets/images/logo.png';
import { currentYear, META_DATA } from '@admin/config/constants';
import { Link } from 'react-router';
import { Button, Card, CardBody, Col, Form, Row } from 'react-bootstrap';
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
                <Form className="mt-4">
                  <div className="mb-4">
                    <div className="avatar-xxl mx-auto mt-2">
                      <div className="avatar-title bg-light-subtle border border-light border-dashed rounded-circle">
                        <img src={icon} alt="dark logo" height={64} />
                      </div>
                    </div>
                  </div>
                  <h4 className="fw-bold text-center mb-4">Well Done! Email verified Successfully</h4>
                  <div className="d-grid">
                    <Button variant="primary" type="submit" className="fw-semibold py-2">
                      Bake to Dashboard
                    </Button>
                  </div>
                </Form>
              </div>
              <p className="text-muted text-center mt-4 mb-0">
                Return to
                <Link to="/auth/split/sign-in" className="text-decoration-underline link-offset-3 fw-semibold">
                  Sign in
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