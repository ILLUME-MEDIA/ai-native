import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Flatpickr from '@admin/components/wrappers/Flatpickr';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Card, CardBody, Col, Container, Form, FormControl, FormLabel, FormSelect, Row } from 'react-bootstrap';
const Page = () => {
  return <>
      <PageBreadcrumb title="Create Task" subtitle="Tasks" />
      <Container fluid="xxl">
        <Card>
          <CardBody>
            <Form>
              <div className="form-group mb-3">
                <FormLabel>
                  Task Title <span className="text-danger">*</span>
                </FormLabel>
                <FormControl type="text" placeholder="Enter task title" required />
              </div>

              <div className="form-group mb-3">
                <FormLabel>Description</FormLabel>
                <FormControl as="textarea" rows={4} placeholder="Write a short task description..." />
              </div>

              <Row className="mb-3">
                <Col md={6}>
                  <div className="form-group">
                    <FormLabel>Start Date</FormLabel>
                    <Flatpickr type="text" className="form-control" options={{
                    dateFormat: 'd M, Y'
                  }} />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="form-group">
                    <FormLabel>Due Date</FormLabel>
                    <Flatpickr type="text" className="form-control" options={{
                    dateFormat: 'd M, Y'
                  }} />
                  </div>
                </Col>
              </Row>

              <div className="form-group mb-3">
                <FormLabel>Assigned To</FormLabel>
                <FormSelect defaultValue="">
                  <option disabled value="">
                    Choose member
                  </option>
                  <option value="1">Cruise</option>
                  <option value="2">Maria</option>
                  <option value="3">Chris</option>
                  <option value="4">Alex</option>
                </FormSelect>
              </div>

              <Row className="mb-3">
                <Col md={6}>
                  <div className="form-group">
                    <FormLabel>Priority</FormLabel>
                    <FormSelect defaultValue="">
                      <option disabled value="">
                        Select priority
                      </option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </FormSelect>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="form-group">
                    <FormLabel>Status</FormLabel>
                    <FormSelect defaultValue="New">
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                    </FormSelect>
                  </div>
                </Col>
              </Row>

              <div className="form-group mb-3">
                <FormLabel>Attachment</FormLabel>
                <FormControl type="file" />
              </div>

              <div className="d-flex justify-content-end mt-4">
                <Button type="reset" variant="light" className="me-2">
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  <Icon icon="plus" className="me-1" /> Create Task
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      </Container>
    </>;
};
export default Page;