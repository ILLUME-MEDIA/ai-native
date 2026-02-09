import authcard from '@admin/assets/images/auth-card-bg.svg';
import logoblack from '@admin/assets/images/logo-black.png';
import logolight from '@admin/assets/images/logo.png';
import Icon from '@admin/components/wrappers/Icon';
import { currentYear, META_DATA } from '@admin/config/constants';
import { Link } from 'react-router';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import CountdownTimer from './components/CountdownTimer';
import CardSideImg from "@admin/assets/images/auth.jpg";
const Page = () => {
  return <>
      <div className="auth-box p-0 w-100">
        <Row className="w-100 g-0">
          <Col xl={6} xxl={4}>
            <Card className="border-0 mb-0">
              <div className="position-absolute top-0 end-0" style={{
              width: 180
            }}>
                <img src={authcard} className="auth-card-bg-img" alt="auth-card-bg" />
              </div>

              <CardBody className="min-vh-100 d-flex flex-column justify-content-center">
                <div className="auth-brand mb-0 text-center">
                  <Link to="/" className="logo-dark">
                    <img src={logoblack} alt="dark logo" height={28} className="img-fluid" />
                  </Link>
                  <Link to="/" className="logo-light">
                    <img src={logolight} alt="logo" height={28} className="img-fluid" />
                  </Link>
                </div>
                <div className="mt-auto">
                  <div className="p-2 text-center">
                    <h3 className="fw-bold my-2">Something Exciting is Coming</h3>
                    <p className="text-muted mb-0">We&apos;re working hard to bring you something amazing. Stay tuned!</p>
                    <CountdownTimer />
                    <div className="error-text-alt fs-xl">Stay tunned!</div>
                    <div className="app-search w-xl-75 mx-auto input-group mt-3 rounded-pill">
                      <input type="text" className="form-control py-2" placeholder="Enter email..." />
                      <Icon icon="mail" className="app-search-icon text-muted" />
                      <button className="btn btn-secondary" type="button">
                        Notify me!
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-center text-muted mt-auto mb-0">
                  © {currentYear} {META_DATA.name} — by <span className="fw-bold">{META_DATA.author}</span>
                </p>
              </CardBody>
            </Card>
          </Col>
          <Col>
            <div className="h-100 position-relative card-side-img rounded-0 overflow-hidden" style={{
            backgroundImage: `url(${CardSideImg})`
          }}>
              <div className="p-4 card-img-overlay auth-overlay d-flex align-items-end justify-content-center" />
            </div>
          </Col>
        </Row>
      </div>
    </>;
};
export default Page;