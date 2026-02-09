import user1 from '@admin/assets/images/users/user-1.jpg';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, CardHeader, CardTitle, Col, Container, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
const Page = () => {
  return <>
      <PageBreadcrumb title="Staff Profile" subtitle="HRM" />
      <Container fluid="xxl">
        <Row>
          <Col xl="4">
            <Card>
              <CardBody>
                <div className="d-flex align-items-center mb-4">
                  <div className="me-3 position-relative">
                    <img src={user1} alt="avatar" className="rounded-circle" width={72} height={72} />
                  </div>
                  <div>
                    <h5 className="mb-0 d-flex align-items-center">
                      <a href="#!" className="link-reset">
                        David Dev
                      </a>
                    </h5>
                    <p className="text-muted mb-2">Senior Developer</p>
                    <span className="badge text-bg-light badge-label">Team Lead</span>
                  </div>
                  <div className="ms-auto">
                    <Dropdown>
                      <DropdownToggle className="content-none btn btn-icon btn-ghost-light text-muted" data-bs-toggle="dropdown">
                        <Icon icon="dots-vertical" className="fs-xl" />
                      </DropdownToggle>
                      <DropdownMenu align="end">
                        <DropdownItem>Edit Profile</DropdownItem>
                        <DropdownItem className="text-danger">Report</DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                    <Icon icon="school" className="fs-xl text-secondary" />
                  </div>
                  <p className="mb-0 fs-sm">
                    Studied at
                    <span className="text-dark fw-semibold">University of British Columbia</span>
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                    <Icon icon="map-pin" className="fs-xl text-secondary" />
                  </div>
                  <p className="mb-0 fs-sm">
                    Lives in
                    <span className="text-dark fw-semibold">Vancouver, Canada</span>
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                    <Icon icon="users" className="fs-xl text-secondary" />
                  </div>
                  <p className="mb-0 fs-sm">
                    Works in
                    <span className="text-dark fw-semibold">Finance &amp; Accounting Department</span>
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                    <Icon icon="mail" className="fs-xl text-secondary" />
                  </div>
                  <p className="mb-0 fs-sm">
                    Email
                    <a href="mailto:yogesh@company.com" className="text-primary fw-semibold">
                      emp2045@company.com
                    </a>
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                    <Icon icon="link" className="fs-xl text-secondary" />
                  </div>
                  <p className="mb-0 fs-sm">
                    Employee ID
                    <span className="text-dark fw-semibold">EMP-2045</span>
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
                    <Icon icon="world" className="fs-xl text-secondary" />
                  </div>
                  <p className="mb-0 fs-sm">
                    Languages
                    <span className="text-dark fw-semibold">English, French</span>
                  </p>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col xl="8">
            <Card>
              <CardHeader>
                <CardTitle as="h4">About Employee</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="m-0">
                  <strong>Alex Johnson</strong> is a passionate and results-driven
                  <span className="text-primary fw-semibold">Project Manager</span> with over 6 years of experience in managing cross-functional teams and delivering projects on time and within budget. Alex specializes in planning, process optimization, and team leadership across
                  multiple domains.
                </p>
                <p className="mt-3 mb-0">
                  Known for strong communication and organizational skills, Alex has successfully led various digital transformation initiatives and implemented efficient workflows that improved team productivity. In free time, Alex enjoys learning new technologies and mentoring
                  young professionals.
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle as="h4">Basic Information</CardTitle>
              </CardHeader>
              <CardBody>
                <Row className="g-3">
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Phone</p>
                    <p className="mb-0">+1 312 555 9482</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Email</p>
                    <p className="mb-0">alex.johnson@example.com</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Gender</p>
                    <p className="mb-0">Male</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Birthday</p>
                    <p className="mb-0">15th March 1988</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Address</p>
                    <p className="mb-0">742 Evergreen Terrace, Chicago</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Nationality</p>
                    <p className="mb-0">American</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Blood Group</p>
                    <p className="mb-0">A+ve</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Shift</p>
                    <p className="mb-0">Day Shift</p>
                  </Col>
                </Row>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle as="h4">Emergency Contact Details</CardTitle>
              </CardHeader>
              <CardBody>
                <Row className="g-3">
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Contact Name</p>
                    <p className="mb-0">Sarah Johnson</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Relationship</p>
                    <p className="mb-0">Spouse</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Phone</p>
                    <p className="mb-0">+1 312 555 7854</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Alternate Phone</p>
                    <p className="mb-0">+1 312 555 9685</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Email</p>
                    <p className="mb-0">sarah.johnson@example.com</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Address</p>
                    <p className="mb-0">742 Evergreen Terrace, Chicago</p>
                  </Col>
                </Row>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle as="h4">Financial Details</CardTitle>
              </CardHeader>
              <CardBody>
                <Row className="g-3">
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Bank Name</p>
                    <p className="mb-0">Bank of America</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Account Number</p>
                    <p className="mb-0">**** **** **** 9845</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">IFSC / SWIFT Code</p>
                    <p className="mb-0">BOFAUS3NXXX</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Branch</p>
                    <p className="mb-0">Downtown Chicago Branch</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">PAN / Tax ID</p>
                    <p className="mb-0">TXN-9823645</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Salary (Monthly)</p>
                    <p className="mb-0">USD $6,500</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">Payment Mode</p>
                    <p className="mb-0">Bank Transfer</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">PF Number</p>
                    <p className="mb-0">PF-20458-CH</p>
                  </Col>
                  <Col md="4">
                    <p className="mb-1 text-muted fw-medium">ESI Number</p>
                    <p className="mb-0">ESI-985721</p>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </>;
};
export default Page;