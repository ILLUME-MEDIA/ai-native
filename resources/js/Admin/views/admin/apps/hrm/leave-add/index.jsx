import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Flatpickr from '@admin/components/wrappers/Flatpickr';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Card, CardBody, CardFooter, CardHeader, CardTitle, Col, Container, Form, FormControl, FormLabel, FormSelect, Row } from 'react-bootstrap';
const Page = () => {
  return <>
      <PageBreadcrumb title="Add Leave" subtitle="HRM" />
      <Container fluid="xxl">
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader className="border-light">
                <CardTitle as="h4" className="mb-0">
                  <Icon icon="calendar-plus" className="me-1" />
                  Apply for Leave
                </CardTitle>
              </CardHeader>
              <CardBody>
                <Form>
                  <Row className="g-3">
                    <Col md="4">
                      <FormLabel>
                        Employee ID <span className="text-danger">*</span>
                      </FormLabel>
                      <FormControl type="text" id="employeeId" placeholder="e.g., EMP-1035" required />
                    </Col>
                    <Col md="4">
                      <FormLabel>
                        Full Name <span className="text-danger">*</span>
                      </FormLabel>
                      <FormControl type="text" id="employeeName" placeholder="Enter full name" required />
                    </Col>
                    <Col md="4">
                      <FormLabel>
                        Department <span className="text-danger">*</span>
                      </FormLabel>
                      <FormSelect id="department" required>
                        <option>Select Department</option>
                        <option>HR</option>
                        <option>Finance</option>
                        <option>IT</option>
                        <option>Design</option>
                        <option>Marketing</option>
                        <option>Operations</option>
                      </FormSelect>
                    </Col>

                    <Col md="4">
                      <FormLabel>
                        From Date <span className="text-danger">*</span>
                      </FormLabel>
                      <Flatpickr className="form-control" required />
                    </Col>
                    <Col md="4">
                      <FormLabel>
                        To Date <span className="text-danger">*</span>
                      </FormLabel>
                      <Flatpickr className="form-control" required />
                    </Col>
                    <Col md="4">
                      <FormLabel>
                        Leave Type <span className="text-danger">*</span>
                      </FormLabel>
                      <FormSelect required>
                        <option>Select Leave Type</option>
                        <option>Sick Leave</option>
                        <option>Casual Leave</option>
                        <option>Paid Leave</option>
                        <option>Unpaid Leave</option>
                        <option>Maternity Leave</option>
                        <option>Half Day Leave</option>
                      </FormSelect>
                    </Col>

                    <Col md="12">
                      <FormLabel>
                        Reason <span className="text-danger">*</span>
                      </FormLabel>
                      <textarea id="reason" className="form-control" rows={3} placeholder="Explain your reason for leave" required />
                    </Col>

                    <Col md="6">
                      <FormLabel>
                        Contact Number <span className="text-danger">*</span>
                      </FormLabel>
                      <FormControl type="text" placeholder="+1 234 567 890" required />
                    </Col>
                    <Col md="6">
                      <FormLabel>
                        Emergency Contact Person <span className="text-danger">*</span>
                      </FormLabel>
                      <FormControl type="text" id="emergencyContact" placeholder="Name of emergency contact" required />
                    </Col>
                    <Col md="12">
                      <FormLabel>Supporting Document (optional)</FormLabel>
                      <input type="file" id="supportDoc" className="form-control" accept=".pdf,.jpg,.jpeg,.png" />
                      <small className="text-muted">Attach medical certificate or proof if required (PDF/JPG/PNG).</small>
                    </Col>
                    <Col md="12">
                      <FormLabel>Additional Remarks</FormLabel>
                      <textarea id="remarks" className="form-control" rows={3} placeholder="Optional comments..." />
                    </Col>
                  </Row>
                </Form>
              </CardBody>

              <CardFooter className="border-light d-flex justify-content-end gap-2">
                <Button variant="link" type="reset">
                  <Icon icon="refresh" className="me-1" />
                  Reset
                </Button>
                <Button type="submit" form="applyLeaveForm" className="btn btn-primary">
                  <Icon icon="send-2" className="me-1" />
                  Submit Application
                </Button>
              </CardFooter>
            </Card>
          </Col>
        </Row>
      </Container>
    </>;
};
export default Page;