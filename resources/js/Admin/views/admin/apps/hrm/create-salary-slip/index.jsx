import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Flatpickr from '@admin/components/wrappers/Flatpickr';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Card, CardBody, CardFooter, CardHeader, Col, Container, Form, FormControl, FormLabel, FormSelect, Row } from 'react-bootstrap';
const Page = () => {
  return <>
      <PageBreadcrumb title="Salary Slip" subtitle="HRM" />
      <Container fluid="xxl">
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader className="justify-content-between">
                <h5 className="mb-0 fw-semibold">
                  <Icon icon="file-text" className="me-2" />
                  Create Salary Slip
                </h5>
                <Button variant="light" size="sm">
                  <Icon icon="printer" className="me-1" /> Print Preview
                </Button>
              </CardHeader>
              <CardBody>
                <Form>
                  <Row className="g-3">
                    <Col md="6">
                      <FormLabel>
                        Employee Name <span className="text-danger">*</span>
                      </FormLabel>
                      <FormSelect id="employeeName" required>
                        <option>Select Employee</option>
                        <option>Samantha Green</option>
                        <option>David Lee</option>
                        <option>Maria Smith</option>
                        <option>Olivia Brown</option>
                        <option>James Walker</option>
                      </FormSelect>
                    </Col>

                    <Col md="6">
                      <FormLabel>
                        Employee ID <span className="text-danger">*</span>
                      </FormLabel>
                      <input type="text" id="employeeId" className="form-control" placeholder="e.g., EMP-1015" required />
                    </Col>

                    <Col md="6">
                      <FormLabel>
                        Department <span className="text-danger">*</span>
                      </FormLabel>
                      <FormSelect id="department" required>
                        <option>Select Department</option>
                        <option>Human Resources</option>
                        <option>Finance</option>
                        <option>IT</option>
                        <option>Marketing</option>
                        <option>Operations</option>
                      </FormSelect>
                    </Col>

                    <Col md="6">
                      <FormLabel>
                        Designation <span className="text-danger">*</span>
                      </FormLabel>
                      <input type="text" id="designation" className="form-control" placeholder="e.g., Senior Developer" required />
                    </Col>

                    <Col md="6">
                      <FormLabel>
                        Pay Period <span className="text-danger">*</span>
                      </FormLabel>
                      <FormSelect id="payPeriod" required>
                        <option>Select Month</option>
                        <option>October 2025</option>
                        <option>September 2025</option>
                        <option>August 2025</option>
                        <option>July 2025</option>
                      </FormSelect>
                    </Col>

                    <Col md="6">
                      <FormLabel>
                        Pay Date <span className="text-danger">*</span>
                      </FormLabel>
                      <Flatpickr className="form-control" required />
                    </Col>

                    <h5 className="fw-semibold text-muted text-uppercase mt-3">Earnings</h5>

                    <Col md="6">
                      <FormLabel>
                        Basic Salary ($) <span className="text-danger">*</span>
                      </FormLabel>
                      <FormControl type="number" id="basicSalary" placeholder="e.g., 5000" min={0} required />
                    </Col>

                    <Col md="6">
                      <FormLabel>House Allowance ($)</FormLabel>
                      <FormControl type="number" id="houseAllowance" placeholder="e.g., 800" min={0} />
                    </Col>

                    <Col md="6">
                      <FormLabel>Medical Allowance ($)</FormLabel>
                      <FormControl type="number" id="medicalAllowance" placeholder="e.g., 400" min={0} />
                    </Col>

                    <Col md="6">
                      <FormLabel>Transport Allowance ($)</FormLabel>
                      <FormControl type="number" id="transportAllowance" placeholder="e.g., 300" min={0} />
                    </Col>
                    <h5 className="fw-semibold text-muted text-uppercase mt-3">Deductions</h5>

                    <Col md="6">
                      <FormLabel>Tax ($)</FormLabel>
                      <FormControl type="number" id="tax" placeholder="e.g., 200" min={0} />
                    </Col>

                    <Col md="6">
                      <FormLabel>Provident Fund ($)</FormLabel>
                      <FormControl type="number" id="providentFund" placeholder="e.g., 150" min={0} />
                    </Col>

                    <Col md="6">
                      <FormLabel>Loan Deduction ($)</FormLabel>
                      <FormControl type="number" id="loanDeduction" placeholder="e.g., 100" min={0} />
                    </Col>
                    <hr className="mt-4 mb-0" />

                    <Col md="6">
                      <FormLabel>Total Earnings ($)</FormLabel>
                      <FormControl type="number" id="totalEarnings" placeholder="Auto-calculated" readOnly />
                    </Col>
                    <Col md="6">
                      <FormLabel>Net Pay ($)</FormLabel>
                      <FormControl type="number" placeholder="Auto-calculated" readOnly />
                    </Col>

                    <Col md="12">
                      <FormLabel>Remarks</FormLabel>
                      <textarea id="remarks" className="form-control" rows={2} placeholder="Optional notes or remarks" />
                    </Col>
                  </Row>
                </Form>
              </CardBody>
              <CardFooter className="border-top text-end">
                <Button variant="light" type="reset">
                  Reset
                </Button>
                &nbsp;
                <Button variant="primary" type="submit">
                  <Icon icon="device-floppy" className="me-1" /> Generate Slip
                </Button>
              </CardFooter>
            </Card>
          </Col>
        </Row>
      </Container>
    </>;
};
export default Page;