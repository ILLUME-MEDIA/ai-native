import user4 from '@admin/assets/images/users/user-4.jpg';
import user5 from '@admin/assets/images/users/user-5.jpg';
import Icon from '@admin/components/wrappers/Icon';
import clsx from 'clsx';
import { Link } from 'react-router';
import { Card, CardBody, CardHeader, Col, Row } from 'react-bootstrap';
import { timelineData } from './data';
const TicketDetails = () => {
  return <Card>
      <CardHeader className="justify-content-between">
        <h5 className="mb-0">
          #SUP-2523 - <span className="text-muted">App freezes when uploading files</span>
        </h5>
        <span className="badge badge-label text-bg-warning">Pending</span>
      </CardHeader>

      <CardBody>
        <Row className="mb-4">
          <Col md={4}>
            <h6 className="text-uppercase text-muted">Requested By</h6>
            <div className="d-flex align-items-center gap-2">
              <img src={user5} alt="Ava Sullivan" className="rounded-circle avatar-sm" />
              <span>Ava Sullivan</span>
            </div>
          </Col>
          <Col md={4}>
            <h6 className="text-uppercase text-muted">Assigned Agent</h6>
            <div className="d-flex align-items-center gap-2">
              <img src={user4} alt="Liam Brooks" className="rounded-circle avatar-sm" />
              <span>Liam Brooks</span>
            </div>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col md={4}>
            <h6 className="text-uppercase text-muted">Priority</h6>
            <span className="badge bg-danger">High</span>
          </Col>
          <Col md={4}>
            <h6 className="text-uppercase text-muted">Created On</h6>
            <p className="mb-0">
              05 Aug, 2025 <small className="text-muted">1:20 PM</small>
            </p>
          </Col>
          <Col md={4}>
            <h6 className="text-uppercase text-muted">Due Date</h6>
            <p className="mb-0">09 Aug, 2025</p>
          </Col>
        </Row>

        <div className="mb-4">
          <h6 className="text-uppercase text-muted">Description</h6>
          <p className="mb-0">When trying to upload files through the project form, the application becomes unresponsive after selecting a file larger than 5MB. This issue occurs consistently across browsers. Please investigate and apply a fix.</p>
        </div>

        <div className="mb-4">
          <h6 className="text-uppercase text-muted">Tags</h6>
          <span className="badge text-bg-light me-1">Upload</span>
          <span className="badge text-bg-light me-1">Performance</span>
          <span className="badge text-bg-light">UI Bug</span>
        </div>

        <div className="mb-4">
          <h6 className="text-uppercase text-muted mb-4">Activity:</h6>
          <div className="timeline">
            {timelineData.map((item, idx) => <div className="timeline-item d-flex align-items-stretch" key={idx}>
                <div className="timeline-time pe-3 text-muted">{item.time}</div>
                <div className={clsx('timeline-dot', item.bulletClassName)}></div>
                <div className="timeline-content ps-3 pb-4">
                  <h6 className="mb-1 fs-sm">{item.title}</h6>
                  <p className="mb-1 text-muted">{item.description}</p>
                  <span className="text-primary fw-semibold">By {item.author}</span>
                </div>
              </div>)}
          </div>
        </div>

        <div className="d-flex gap-2 justify-content-center">
          <Link to="/apps/ticket/create" className="btn btn-primary">
            <Icon icon="pencil" className="me-1" />
            Edit Ticket
          </Link>
          <Link to="#" className="btn btn-danger">
            <Icon icon="x" className="me-1" />
            Close Ticket
          </Link>
          <Link to="/apps/ticket/list" className="btn btn-outline-secondary">
            <Icon icon="arrow-left" className="me-1" />
            Back to List
          </Link>
        </div>
      </CardBody>
    </Card>;
};
export default TicketDetails;