import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Card, CardBody, Col, Form, FormControl, FormLabel, FormSelect, Row } from 'react-bootstrap';
const Page = () => {
  return <>
      <PageBreadcrumb title="Create New Ticket" subtitle="Support" />
      <Row className="justify-content-center">
        <Col xxl={10}>
          <Card>
            <Form action="#" method="post">
              <CardBody>
                <div className="mb-3">
                  <FormLabel htmlFor="requester">Requester Name</FormLabel>
                  <FormControl type="text" id="requester" placeholder="Enter your full name" />
                </div>

                <div className="mb-3">
                  <FormLabel htmlFor="email">Email Address</FormLabel>
                  <FormControl type="email" id="email" placeholder="you@example.com" />
                </div>

                <div className="mb-3">
                  <FormLabel htmlFor="subject">Ticket Subject</FormLabel>
                  <FormControl type="text" id="subject" placeholder="Brief summary of the issue" />
                </div>

                <Row className="mb-3">
                  <Col md={6}>
                    <FormLabel htmlFor="priority">Priority</FormLabel>
                    <FormSelect id="priority" defaultValue="">
                      <option disabled value="">
                        Choose...
                      </option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </FormSelect>
                  </Col>
                  <Col md={6}>
                    <FormLabel htmlFor="tickstatus">Status</FormLabel>
                    <FormSelect id="tickstatus" defaultValue="">
                      <option disabled value="">
                        Choose...
                      </option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </FormSelect>
                  </Col>
                </Row>

                <div className="mb-3">
                  <FormLabel htmlFor="tags">Tags (comma-separated)</FormLabel>
                  <FormControl type="text" id="tags" placeholder="e.g. login, error, payment" />
                </div>

                <div className="mb-4">
                  <FormLabel htmlFor="description">Description</FormLabel>
                  <FormControl as="textarea" id="description" rows={5} placeholder="Describe the issue in detail..." />
                </div>

                <div className="d-flex gap-2 justify-content-center">
                  <Button type="submit" variant="primary">
                    <Icon icon="plus" className="me-1" /> Submit Ticket
                  </Button>
                  <Button type="reset" variant="outline-secondary">
                    <Icon icon="refresh" className="me-1" /> Reset
                  </Button>
                </div>
              </CardBody>
            </Form>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Page;