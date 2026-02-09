import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Card, CardBody, CardHeader, Col, Row } from 'react-bootstrap';
import ProjectTabs from './components/ProjectTabs';
import Sidebar from './components/Sidebar';
const Page = () => {
  return <>
      <PageBreadcrumb title="Project Overview" subtitle="Projects" />

      <Row>
        <Col xxl={12}>
          <Row className="g-0">
            <Col xl={9}>
              <Card className="card-h-100 rounded-0 rounded-start border-end border-dashed">
                <CardHeader className="align-items-start p-4">
                  <div>
                    <h3 className="mb-1 d-flex fs-xl align-items-center">Complete Presentation Slides for Meeting</h3>
                    <p className="text-muted mb-2 fs-xxs">Updated 10 minutes ago</p>
                    <span className="badge badge-soft-warning fs-xxs badge-label">New</span>
                  </div>
                  <div className="ms-auto">
                    <Button variant="light">
                      <Icon icon="pencil" className="me-1" /> Edit Task
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className="px-4">
                  <div className="mb-4">
                    <h5 className="fs-base mb-2">Task Description:</h5>
                    <p className="text-muted">Prepare and finalize the presentation slides for the upcoming business strategy meeting. Include sections for overview, KPIs, and next quarter goals to ensure clarity and alignment.</p>
                    <p className="text-muted">The task requires coordination with the marketing and finance teams for data verification. Final review and approval must be completed before the meeting date.</p>
                  </div>
                  <Row className="mb-4">
                    <Col md={4} xl={3}>
                      <h6 className="mb-1 text-muted text-uppercase">Created Date:</h6> <p className="fw-medium mb-0">May 9, 2025</p>
                    </Col>
                    <Col md={4} xl={3}>
                      <h6 className="mb-1 text-muted text-uppercase">Due Date:</h6> <p className="fw-medium mb-0 text-danger">Today</p>
                    </Col>
                    <Col md={4} xl={3}>
                      <h6 className="mb-1 text-muted text-uppercase">Assigned To:</h6> <p className="fw-medium mb-0">Cruise +2 Members</p>
                    </Col>
                    <Col md={4} xl={3}>
                      <h6 className="mb-1 text-muted text-uppercase">Priority:</h6> <p className="fw-medium mb-0 text-danger">High</p>
                    </Col>
                  </Row>
                  <ProjectTabs />
                </CardBody>
              </Card>
            </Col>

            <Col xl={3}>
              <Sidebar />
            </Col>
          </Row>
        </Col>
      </Row>
    </>;
};
export default Page;