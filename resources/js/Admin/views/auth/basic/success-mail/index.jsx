import authcard from '@admin/assets/images/auth-card-bg.svg';
import icon from '@admin/assets/images/checkmark.png';
import logodark from '@admin/assets/images/logo-black.png';
import logolight from '@admin/assets/images/logo.png';
import { currentYear, META_DATA } from '@admin/config/constants';
import { Link } from 'react-router';
import { Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
const Page = () => {
  return <>
      <div className="position-absolute top-0 end-0">
        <img src={authcard} className="auth-card-bg-img" alt="auth-card-bg" />
      </div>
      <div className="position-absolute bottom-0 start-0" style={{
      transform: 'rotate(180deg)'
    }}>
        <img src={authcard} className="auth-card-bg-img" alt="auth-card-bg" />
      </div>
      <div className="auth-box overflow-hidden align-items-center d-flex">
        <Container>
          <Row className="justify-content-center">
            <Col xxl={5} md={6} sm={8}>
              <Card className="p-4">
                <div className="auth-brand text-center mb-3">
                  <Link to="/" className="logo-dark">
                    <img src={logodark} alt="dark logo" width={103} height={26} className="img-fluid" />
                  </Link>
                  <Link to="/" className="logo-light">
                    <img src={logolight} alt="logo" width={103} height={26} className="img-fluid" />
                  </Link>
                  <p className="text-muted w-lg-75 mt-3 mx-auto">Awesome! You&apos;ve read the important message like a pro.</p>
                </div>
                <Form>
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
                      Back to Dashboard
                    </Button>
                  </div>
                </Form>
              </Card>
              <p className="text-center text-muted mt-4 mb-0">
                © {currentYear} {META_DATA.name} — by
                <span className="fw-bold">{META_DATA.author}</span>
              </p>
            </Col>
          </Row>
        </Container>
      </div>
    </>;
};
export default Page;