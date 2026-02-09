import authcard from '@admin/assets/images/auth-card-bg.svg';
import deleteImg from '@admin/assets/images/delete.png';
import blacklogo from '@admin/assets/images/logo-black.png';
import logo from '@admin/assets/images/logo.png';
import { currentYear, META_DATA } from '@admin/config/constants';
import { Link } from 'react-router';
import { Button, Card, Col, Container, Row } from 'react-bootstrap';
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
                <div className="auth-brand text-center mb-3 position-relative">
                  <Link to="/" className="logo-dark">
                    <img src={blacklogo} alt="dark logo" width={103} height={26} className="img-fluid" />
                  </Link>
                  <Link to="/" className="logo-light">
                    <img src={logo} alt="logo" width={103} height={26} className="img-fluid" />
                  </Link>
                </div>
                <div className="mb-4">
                  <div className="avatar-xxl mx-auto mt-2">
                    <div className="avatar-title bg-light-subtle border border-light border-dashed rounded-circle">
                      <img src={deleteImg} alt="dark logo" height={64} />
                    </div>
                  </div>
                </div>
                <h4 className="fw-bold text-center mb-3">Account Deactivated</h4>
                <p className="text-muted text-center mb-4">Your account is currently inactive. Reactivate now to regain access to all features and opportunities.</p>
                <div className="d-grid">
                  <Button variant="primary" type="submit" className="fw-semibold py-2">
                    Reactivate Now
                  </Button>
                </div>
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