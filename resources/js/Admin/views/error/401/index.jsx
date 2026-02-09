import AuthImage from '@admin/assets/images/auth-card-bg.svg';
import LogoDark from '@admin/assets/images/logo-black.png';
import Logo from '@admin/assets/images/logo.png';
import { currentYear, META_DATA } from '@admin/config/constants';
import { Link } from 'react-router';
import { Card, Col, Container, Row } from 'react-bootstrap';
const Page = () => {
  return <>
      <div className="position-absolute top-0 end-0">
        <img src={AuthImage} className="auth-card-bg-img" alt="auth-card-bg" />
      </div>
      <div className="position-absolute bottom-0 start-0" style={{
      transform: 'rotate(180deg)'
    }}>
        <img src={AuthImage} className="auth-card-bg-img" alt="auth-card-bg" />
      </div>

      <div className="auth-box overflow-hidden align-items-center d-flex">
        <Container>
          <Row className="justify-content-center">
            <Col xxl={5} md={6} sm={8}>
              <Card className="p-4">
                <div className="auth-brand text-center mb-2">
                  <Link to="/index" className="logo-dark">
                    <img src={LogoDark} alt="dark logo" height="28" />
                  </Link>
                  <Link to="/index" className="logo-light">
                    <img src={Logo} alt="logo" height="28" />
                  </Link>
                </div>
                <div className="p-2 text-center">
                  <div className="error-text-alt fs-72">401</div>
                  <h3 className="fw-bold text-uppercase">Access Restricted</h3>
                  <p className="text-muted">You don&apos;t have permission to view this content.</p>
                  <Link className="btn btn-primary mt-3 rounded-pill" to="/">
                    Go Home
                  </Link>
                </div>
              </Card>
              <p className="text-center text-muted mt-4 mb-0">
                © {currentYear} {META_DATA.name} — by <span className="fw-semibold">{META_DATA.author}</span>
              </p>
            </Col>
          </Row>
        </Container>
      </div>
    </>;
};
export default Page;