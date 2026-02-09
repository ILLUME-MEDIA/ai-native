import authcard from '@admin/assets/images/auth-card-bg.svg';
import blacklogo from '@admin/assets/images/logo-black.png';
import logo from '@admin/assets/images/logo.png';
import user1 from '@admin/assets/images/users/user-1.jpg';
import { currentYear, META_DATA } from '@admin/config/constants';
import { Link } from 'react-router';
import { Card, Col, Container, Row } from 'react-bootstrap';
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
                <div className="text-center mb-4">
                  <img src={user1} className="rounded-circle img-thumbnail avatar-xxl mb-2" alt="thumbnail" />
                  <h5 className="fs-md">{META_DATA.username}</h5>
                </div>
                <Forms />
                <p className="text-muted text-center mt-4 mb-0">
                  Not you? Return to&nbsp;
                  <Link to="/auth/sign-in" className="text-decoration-underline link-offset-3 fw-semibold">
                    Sign in
                  </Link>
                </p>
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