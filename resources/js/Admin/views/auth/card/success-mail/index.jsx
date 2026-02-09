import authcard from '@admin/assets/images/auth-card-bg.svg';
import auth from '@admin/assets/images/auth.jpg';
import icon from '@admin/assets/images/checkmark.png';
import logodark from '@admin/assets/images/logo-black.png';
import logolight from '@admin/assets/images/logo.png';
import { currentYear, META_DATA } from '@admin/config/constants';
import { Link } from 'react-router';
import { Button, Card, CardBody, Col, Container, Form, Row } from 'react-bootstrap';
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
      <div className="auth-box d-flex align-items-center">
        <Container fluid="xxl">
          <Row className="align-items-center justify-content-center">
            <Col xl={10}>
              <Card>
                <Row className="justify-content-between g-0">
                  <Col lg={6}>
                    <CardBody className="position-relative">
                      <div className="auth-brand text-center mb-4">
                        <Link to="/" className="logo-dark">
                          <img src={logodark} alt="dark logo" width={103} height={26} className="img-fluid" />
                        </Link>
                        <Link to="/" className="logo-light">
                          <img src={logolight} alt="logo" width={103} height={26} className="img-fluid" />
                        </Link>
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
                      <p className="text-center text-muted mt-4 mb-0">
                        © {currentYear} {META_DATA.name} — by <span className="fw-bold">{META_DATA.author}</span>
                      </p>
                    </CardBody>
                  </Col>
                  <Col lg={6} className="d-none d-lg-block">
                    <div className="h-100 position-relative card-side-img rounded-end overflow-hidden" style={{
                    backgroundImage: `url(${auth})`
                  }}>
                      <div className="p-4 card-img-overlay rounded-end auth-overlay d-flex align-items-end justify-content-center" />
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </>;
};
export default Page;