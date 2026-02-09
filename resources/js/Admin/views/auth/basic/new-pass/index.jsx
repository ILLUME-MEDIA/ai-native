import authcard from "@admin/assets/images/auth-card-bg.svg";
import logoblack from "@admin/assets/images/logo-black.png";
import logolight from "@admin/assets/images/logo.png";
import { currentYear, META_DATA } from "@admin/config/constants";
import { Link } from 'react-router';
import { Card, Col, Container, Row } from "react-bootstrap";
import Forms from "./components/Forms";
const Page = () => {
  return <>
      <div className="position-absolute top-0 end-0">
        <img src={authcard} className="auth-card-bg-img" alt="auth-card-bg" />
      </div>
      <div className="position-absolute bottom-0 start-0" style={{
      transform: "rotate(180deg)"
    }}>
        <img src={authcard} className="auth-card-bg-img" alt="auth-card-bg" />
      </div>

      <div className="auth-box overflow-hidden align-items-center d-flex">
        <Container>
          <Row className="justify-content-center">
            <Col xxl={5} md={6} sm={8}>
              <Card className="p-4">
                <div className="auth-brand text-center mb-4">
                  <Link to="/" className="logo-dark">
                    <img src={logoblack} alt="dark logo" width={103} height={26} className="img-fluid" />
                  </Link>
                  <Link to="/" className="logo-light">
                    <img src={logolight} alt="logo" width={103} height={26} className="img-fluid" />
                  </Link>
                  <p className="text-muted w-lg-75 mx-auto mt-3">
                    We&apos;ve emailed you a 6-digit verification code. Please
                    enter it below to confirm your email address
                  </p>
                </div>
                <Forms />
                <p className="mt-4 text-muted text-center mb-4">
                  Don&apos;t have a code?&nbsp;
                  <Link to="" className="text-decoration-underline link-offset-2 fw-semibold">
                    Resend
                  </Link>
                  &nbsp; or&nbsp;
                  <Link to="" className="text-decoration-underline link-offset-2 fw-semibold">
                    Call Us
                  </Link>
                </p>
                <p className="text-muted text-center mb-0">
                  Return to&nbsp;
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