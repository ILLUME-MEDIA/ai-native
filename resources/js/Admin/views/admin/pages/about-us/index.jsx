import user1 from '@admin/assets/images/users/user-1.jpg';
import user2 from '@admin/assets/images/users/user-2.jpg';
import user7 from '@admin/assets/images/users/user-7.jpg';
import user8 from '@admin/assets/images/users/user-8.jpg';
import user9 from '@admin/assets/images/users/user-9.jpg';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Button, Card, CardBody, CardFooter, Col, Container, Row } from 'react-bootstrap';
import { branchData, featureData, teamMemberData } from './components/data';
const Page = () => {
  return <>
      <PageBreadcrumb title="About US" subtitle="Pages" />

      <Row>
        <Col xs="12">
          <Card>
            <CardBody>
              <Row className="bg-light bg-opacity-50">
                <Col lg={8} className="mx-auto py-5 text-center">
                  <span className="fw-semibold text-muted fst-italic">Trusted by 1M+ AI innovators worldwide</span>
                  <div className="avatar-group avatar-group-sm justify-content-center mt-3">
                    <div className="avatar">
                      <img src={user7} alt="Ava Lee" className="avatar-sm rounded-circle" />
                    </div>
                    <div className="avatar">
                      <img src={user8} alt="Ethan King" className="avatar-sm rounded-circle" />
                    </div>
                    <div className="avatar">
                      <img src={user9} alt="Lucas White" className="avatar-sm rounded-circle" />
                    </div>
                    <div className="avatar">
                      <img src={user1} alt="Lucas White" className="avatar-sm rounded-circle" />
                    </div>
                    <div className="avatar">
                      <img src={user2} alt="Lucas White" className="avatar-sm rounded-circle" />
                    </div>
                  </div>
                  <h1 className="my-4 fs-36 fw-bold lh-base">
                    Accelerate Innovation with the <span className="text-primary">AI Control Panel</span> –<span className="fst-italic text-muted">Smart. Scalable. Built for the Future.</span>
                  </h1>
                  <p className="mb-4 fs-sm text-muted lh-lg">Design, deploy, and manage machine learning models faster than ever. Our AI Control Panel empowers teams to collaborate, monitor, and scale securely with intuitive dashboards and cutting-edge analytics.</p>
                  <div className="d-flex gap-1 gap-sm-2 flex-wrap justify-content-center">
                    <Button variant="light" className="py-2 fw-semibold">
                      <Icon icon="phone-ringing" className="fs-xl me-2" />
                      Get a Demo
                    </Button>
                  </div>
                </Col>
              </Row>
              <section className="py-5">
                <Container>
                  <Row>
                    <Col xs="12" className="text-center">
                      <span className="text-muted rounded-3 d-inline-block">💼 Tailored Solutions for Every Need</span>
                      <h2 className="mt-3 fw-bold mb-5">
                        Explore Our Professional
                        <span className="text-primary">Services</span>
                        and Expertise
                      </h2>
                    </Col>
                  </Row>
                  <Row className="text-center">
                    {featureData.slice(0, 3).map((feature, idx) => <Col xl={4} md={6} key={idx}>
                        <Card className="border-0 shadow-none p-2 card-h-100">
                          <CardBody className="pb-0">
                            <div className="avatar-xl mx-auto mb-3">
                              <span className="avatar-title bg-secondary-subtle text-secondary rounded-circle fs-22">
                                <Icon icon={feature.icon} />
                              </span>
                            </div>
                            <h4 className="mb-2">{feature.title}</h4>
                            <p className="text-muted mb-3">{feature.description}</p>
                          </CardBody>
                          <CardFooter className="border-0 pt-0">
                            <Link className="link-primary fw-semibold" to="">
                              Know more
                              <Icon icon="arrow-right" className="ms-1 align-middle" />
                            </Link>
                          </CardFooter>
                        </Card>
                      </Col>)}
                  </Row>

                  <Row className="text-center">
                    {featureData.slice(3, 6).map((feature, idx) => <Col xl={4} md={6} key={idx}>
                        <Card className="border-0 shadow-none p-2 card-h-100">
                          <CardBody className="pb-0">
                            <div className="avatar-xl mx-auto mb-3">
                              <span className="avatar-title bg-secondary-subtle text-secondary rounded-circle fs-22">
                                <Icon icon={feature.icon} />
                              </span>
                            </div>
                            <h4 className="mb-2">{feature.title}</h4>
                            <p className="text-muted mb-3">{feature.description}</p>
                          </CardBody>
                          <CardFooter className="border-0 pt-0">
                            <Link className="link-primary fw-semibold" to="">
                              Know more
                              <Icon icon="arrow-right" className="ms-1 align-middle" />
                            </Link>
                          </CardFooter>
                        </Card>
                      </Col>)}
                  </Row>
                </Container>
              </section>

              <section className="border-top border-dashed py-5">
                <Container>
                  <Row>
                    <Col xs="12" className="text-center">
                      <h3 className="fw-bold mb-5">
                        Meet Our <mark className="text-warning">Dedicated</mark> Team
                      </h3>
                    </Col>
                  </Row>
                  <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 justify-content-center">
                    {teamMemberData.map((member, idx) => <Col key={idx}>
                        <Card className="border-light">
                          <CardBody className="border-0 pb-0 text-center">
                            <div className="mx-auto mb-3">
                              <img src={member.image} alt={member.name} className="img-fluid rounded" />
                            </div>
                            <h4 className="mb-1 fs-md">{member.name}</h4>
                            <p className="text-muted mb-3 fst-italic fs-sm">{member.role}</p>
                          </CardBody>
                        </Card>
                      </Col>)}
                  </Row>
                </Container>
              </section>

              <section className="border border-dashed p-5 pb-3 rounded bg-light bg-opacity-25">
                <Container>
                  <Row>
                    <Col xs="12" className="text-center">
                      <h3 className="fw-bold mb-5">
                        Expanding Horizons. <span className="text-primary">Empowering</span> Futures
                      </h3>
                    </Col>
                  </Row>
                  <Row>
                    {branchData.map((branch, idx) => <Col xl={4} key={idx}>
                        <Card className="border-light p-2 card-h-100">
                          <CardBody className="pb-0">
                            <img src={branch.image} className="avatar-xl mb-3 rounded-circle" alt={branch.country} />
                            <h4 className="fw-semibold mb-2">{branch.country}</h4>
                            <p className="text-muted mb-3" dangerouslySetInnerHTML={{
                          __html: branch.address
                        }}></p>
                          </CardBody>
                          <CardFooter className="border-0 pt-0">
                            <Link className="link-primary fw-semibold" to="">
                              Contact Us
                              <Icon icon="arrow-right" className="ms-1 align-middle" />
                            </Link>
                          </CardFooter>
                        </Card>
                      </Col>)}
                  </Row>
                </Container>
              </section>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Page;