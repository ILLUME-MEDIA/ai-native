import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Card, CardBody, Col, Form, FormControl, FormLabel, Row } from 'react-bootstrap';
const Page = () => {
  return <>
      <PageBreadcrumb title="Contact Us" subtitle="Pages" />

      <Row>
        <Col xs="12">
          <Card>
            <CardBody>
              <Row className="bg-light bg-opacity-50">
                <Col xs="12" className="py-2 text-center">
                  <iframe src="https://www.google.com/maps/embed/v1/place?q=Eiffel+Tower&key=AIzaSyBSFRN6WWGYwmFi498qXXsD2UwkbmD74v4" style={{
                  width: '100%',
                  height: 360,
                  overflow: 'hidden',
                  border: 0
                }} />
                </Col>
              </Row>
              <section className="py-5">
                <Row>
                  <Col xs="12" className="text-center">
                    <span className="text-muted rounded-3 d-inline-block">📩 We&apos;re here to help</span>
                    <h3 className="mt-3 fw-bold mb-5">
                      Get in Touch with <mark>Our Team</mark>
                    </h3>
                  </Col>
                </Row>
                <Row>
                  <Col xxl={4}>
                    <div className="p-4">
                      <div className="d-flex gap-3 mb-5">
                        <div className="avatar-xl flex-shrink-0">
                          <span className="avatar-title bg-secondary-subtle text-secondary rounded-circle fs-22">
                            <Icon icon="phone-call" />
                          </span>
                        </div>
                        <div>
                          <span className="text-muted">Contact Numbers</span>
                          <h5 className="my-2">+1 (800) 123-4567</h5>
                          <h5 className="mb-0">+1 (415) 987-6543</h5>
                        </div>
                      </div>
                      <div className="d-flex gap-3 mb-5">
                        <div className="avatar-xl flex-shrink-0">
                          <span className="avatar-title bg-secondary-subtle text-secondary rounded-circle fs-22">
                            <Icon icon="mail" />
                          </span>
                        </div>
                        <div>
                          <span className="text-muted">Email</span>
                          <h5 className="my-2">support@yourcompany.com</h5>
                          <h5 className="mb-0">info@yourcompany.com</h5>
                        </div>
                      </div>
                      <div className="d-flex gap-3">
                        <div className="avatar-xl flex-shrink-0">
                          <span className="avatar-title bg-secondary-subtle text-secondary rounded-circle fs-22">
                            <Icon icon="map-pin" />
                          </span>
                        </div>
                        <div>
                          <span className="text-muted">Address</span>
                          <h5 className="my-1 lh-lg">Premium HQ, 123 Market Street, 5th Floor, Financial District, San Francisco, CA 94103, United States</h5>
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col xxl={8}>
                    <Form className="p-4 border rounded-4 border-dashed">
                      <Row className="g-3">
                        <Col md={6}>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl type="text" className="py-2" id="name" autoComplete="name" placeholder="Enter your full name" />
                        </Col>
                        <Col md={6}>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl type="email" className="py-2" id="email" autoComplete="email" placeholder="Enter your email" />
                        </Col>
                        <Col md={12}>
                          <FormLabel>Subject</FormLabel>
                          <FormControl type="text" className="py-2" id="subject" placeholder="What’s the reason for contact?" />
                        </Col>
                        <Col md={12}>
                          <FormLabel>Message</FormLabel>
                          <textarea className="form-control py-2" id="message" rows={5} placeholder="Write your message here..." />
                        </Col>
                        <Col md={12} className="text-end">
                          <Button variant="primary" type="submit" className="rounded-pill">
                            Send Message
                          </Button>
                        </Col>
                      </Row>
                    </Form>
                  </Col>
                </Row>
              </section>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Page;