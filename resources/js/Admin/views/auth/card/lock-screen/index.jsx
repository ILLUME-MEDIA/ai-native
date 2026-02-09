import authcard from '@admin/assets/images/auth-card-bg.svg';
import auth from '@admin/assets/images/auth.jpg';
import blacklogo from '@admin/assets/images/logo-black.png';
import logo from '@admin/assets/images/logo.png';
import user1 from '@admin/assets/images/users/user-1.jpg';
import { currentYear, META_DATA } from '@admin/config/constants';
import { Link } from 'react-router';
import { Card, CardBody, Col, Container, Row } from 'react-bootstrap';
import Forms from './components/Forms';
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
                          <img src={blacklogo} alt="dark logo" width={103} height={26} className="img-fluid" />
                        </Link>
                        <Link to="/" className="logo-light">
                          <img src={logo} alt="logo" width={103} height={26} className="img-fluid" />
                        </Link>
                        <h4 className="fw-bold mt-4">Lock Screen!</h4>
                        <p className="text-muted w-lg-75 mx-auto">This screen is locked. Enter your password to continue.</p>
                      </div>
                      <div className="text-center mb-4">
                        <img src={user1} className="rounded-circle img-thumbnail avatar-xxl mb-2" alt="thumbnail" />
                        <h5 className="fs-md">{META_DATA.username}</h5>
                      </div>
                      <Forms />
                      <p className="text-muted text-center mt-4 mb-0">
                        Not you? Return to&nbsp;
                        <Link to="/auth/card/sign-in" className="text-decoration-underline link-offset-3 fw-semibold">
                          Sign in
                        </Link>
                      </p>
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