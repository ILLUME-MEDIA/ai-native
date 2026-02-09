import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Accordion, AccordionBody, AccordionButton, AccordionItem, Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
import { customizationFaqData, generalFaqData, paymentFaqData, refundFaqData } from './components/data';
const Page = () => {
  return <>
      <PageBreadcrumb title="Account Settings" subtitle="Pages" />
      <Row className="justify-content-center">
        <Col xxl="10">
          <Row className="justify-content-center mb-5">
            <Col lg={6} md={8}>
              <div className="text-center">
                <div className="mb-3">
                  <Icon icon="help-hexagon" className="fs-1 text-primary" />
                </div>
                <h3 className="fw-semibold mb-2">Need Help with Something?</h3>
                <p className="text-muted mb-4">
                  We&apos;re here to assist you with any technical questions, account issues, or feedback.
                  <br />
                  Reach out to our support team — we&apos;ll get back to you as soon as possible!
                </p>
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <Link to="mailto:support@example.com" className="btn btn-success">
                    <Icon icon="mail" className="fs-5 me-1" />
                    Contact Support
                  </Link>
                  <Link to="https://twitter.com/intent/tweet?text=Hello+Support" target="_blank" className="btn btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="me-1">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
                    </svg>
                    Tweet to Us
                  </Link>
                </div>
              </div>
            </Col>
          </Row>

          <Row>
            <Col xl="6">
              <Card>
                <CardHeader className="d-block">
                  <CardTitle as="h4" className="mb-1">
                    General
                  </CardTitle>
                  <p className="text-muted mb-0">Here are some common questions about our templates.</p>
                </CardHeader>

                <CardBody>
                  <Accordion className="accordion-bordered" id="BorderedaccordionExample">
                    {generalFaqData.map((faq, index) => <AccordionItem eventKey={`${index + 1}`} key={index} className="border-0">
                        <AccordionButton className="shadow-none bg-light bg-opacity-50">{faq.question}</AccordionButton>
                        <AccordionBody>{faq.answer}</AccordionBody>
                      </AccordionItem>)}
                  </Accordion>
                </CardBody>
              </Card>
            </Col>

            <Col xl="6">
              <Card>
                <CardHeader className="d-block">
                  <CardTitle as="h4" className="mb-1">
                    Payments
                  </CardTitle>
                  <p className="text-muted mb-0">Here are some common questions related to billing and payment.</p>
                </CardHeader>

                <CardBody>
                  <Accordion className="accordion-bordered" id="BorderedaccordionExample">
                    {paymentFaqData.map((faq, index) => <AccordionItem eventKey={`${index + 1}`} key={index} className="border-0">
                        <AccordionButton className="shadow-none bg-light bg-opacity-50">{faq.question}</AccordionButton>
                        <AccordionBody>{faq.answer}</AccordionBody>
                      </AccordionItem>)}
                  </Accordion>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col xl="6">
              <Card>
                <CardHeader className="d-block">
                  <CardTitle as="h4" className="mb-1">
                    Refunds
                  </CardTitle>
                  <p className="text-muted mb-0">Find answers related to our refund policy and conditions.</p>
                </CardHeader>
                <CardBody>
                  <Accordion className="accordion-bordered" id="BorderedaccordionExample">
                    {refundFaqData.map((faq, index) => <AccordionItem eventKey={`${index + 1}`} key={index} className="border-0">
                        <AccordionButton className="shadow-none bg-light bg-opacity-50">{faq.question}</AccordionButton>
                        <AccordionBody>{faq.answer}</AccordionBody>
                      </AccordionItem>)}
                  </Accordion>
                  &lt;
                </CardBody>
              </Card>
            </Col>
            <Col xl="6">
              <Card>
                <CardHeader className="d-block">
                  <CardTitle as="h4" className="mb-1">
                    Customization
                  </CardTitle>
                  <p className="text-muted mb-0">Questions about custom development and template modifications.</p>
                </CardHeader>
                <CardBody>
                  <Accordion className="accordion-bordered" id="BorderedaccordionExample">
                    {customizationFaqData.map((faq, index) => <AccordionItem eventKey={`${index + 1}`} key={index} className="border-0">
                        <AccordionButton className="shadow-none bg-light bg-opacity-50">{faq.question}</AccordionButton>
                        <AccordionBody>{faq.answer}</AccordionBody>
                      </AccordionItem>)}
                  </Accordion>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </>;
};
export default Page;