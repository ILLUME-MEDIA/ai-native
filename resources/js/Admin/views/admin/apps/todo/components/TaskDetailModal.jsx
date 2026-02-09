import Icon from '@admin/components/wrappers/Icon';
import clsx from 'clsx';
import { Button, Col, FormControl, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
const TaskDetailModal = ({
  task,
  showDetailModal,
  toggleDetailModal
}) => {
  const {
    title,
    assignee,
    due,
    tasks,
    priority,
    status
  } = task;
  return <Modal show={showDetailModal} onHide={toggleDetailModal} centered size="lg">
      <ModalHeader>
        <ModalTitle id="taskDetailsModalLabel">{title}</ModalTitle>
        <Button variant="" className="btn-close" onClick={toggleDetailModal} aria-label="Close" />
      </ModalHeader>

      <ModalBody>
        <div className="d-flex align-items-center mb-4">
          <OverlayTrigger placement="top" overlay={<Tooltip>Assigned by {assignee[0].name}</Tooltip>}>
            <div className="avatar me-2">
              <img src={assignee[0].image} alt="" className="rounded-circle" width={40} height={40} />
            </div>
          </OverlayTrigger>
          <div>
            <span className="fw-semibold">Assigned by:</span> {assignee[0].name}
          </div>
        </div>

        <Row className="g-3">
          <Col md={4}>
            <label className="text-uppercase d-block fw-semibold fs-xs text-muted mb-1">Status</label>
            <span className={clsx('badge', status === 'pending' ? 'badge-outline-warning' : status === 'urgent' ? 'badge-outline-danger' : 'badge-outline-success')}>{status}</span>
          </Col>
          <Col md={4}>
            <label className="text-uppercase d-block fw-semibold fs-xs text-muted mb-1">Priority</label>
            <span className={clsx('badge p-1', priority === 'high' ? 'badge-soft-danger' : priority === 'medium' ? 'badge-soft-warning' : 'badge-soft-success')}>{priority}</span>
          </Col>
          <Col md={4}>
            <label className="text-uppercase d-block fw-semibold fs-xs text-muted mb-1">Due Date</label>
            <span className="fw-semibold">{due}</span>
          </Col>
          <Col md={4}>
            <label className="text-uppercase d-block fw-semibold fs-xs text-muted mb-1">Progress</label>
            <span className="fw-medium">
              {tasks.done}/{tasks.total}
            </span>
          </Col>
          <Col md={4}>
            <label className="text-uppercase d-block fw-semibold fs-xs text-muted mb-1">Assigned To</label>
            <div className="avatar-group avatar-group-sm">
              {assignee.map((assignee, idx) => <OverlayTrigger key={idx} placement="top" overlay={<Tooltip id="maria">Maria 💻</Tooltip>}>
                  <div className="avatar">
                    <img src={assignee.image} alt="" className="rounded-circle fs-24 avatar-img-size" width={32} height={32} />
                  </div>
                </OverlayTrigger>)}
            </div>
          </Col>

          <Col md={12}>
            <label className="text-uppercase d-block fw-semibold fs-xs text-muted mb-1">Description</label>
            <p className="mb-0">Preparing and finalizing the product roadmap for the upcoming launch with clear milestones and dependencies.</p>
          </Col>

          <Col xs={12}>
            <div className="bg-light-subtle mx-n3 p-3 border-top border-bottom border-dashed">
              <div className="d-flex align-items-start">
                <img src={assignee[0].image} alt="" className="me-2 avatar-sm rounded-circle" width={32} height={32} />
                <div className="w-100 fs-sm">
                  <h6 className="mt-0 mb-1">
                    <a href="#!" className="link-reset">
                      {assignee[0].name}
                    </a>
                    <small className="text-muted fw-normal float-end">20 minutes ago</small>
                  </h6>
                  Loved your recent project! Really curious to see how you implemented the animations.
                  <br />
                  <a href="#!" className="text-muted font-13 d-inline-block mt-2">
                    <Icon icon="corner-up-left"></Icon> Reply
                  </a>
                  <div className="d-flex align-items-start mt-3">
                    <a className="pe-2" href="#">
                      <img src={assignee[1].image} alt="" className="avatar-sm rounded-circle" width={32} height={32} />
                    </a>
                    <div className="w-100">
                      <h6 className="mt-0 mb-1">
                        <a href="#!" className="link-reset">
                          {assignee[1].name}
                        </a>
                        <small className="text-muted fw-normal float-end">12 minutes ago</small>
                      </h6>
                      I created something similar in Angular last month — would love to swap tips!
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-start mt-3">
                <a className="pe-2" href="#">
                  <img src={assignee[0].image} alt="" className="rounded-circle" width={31} height={31} />
                </a>
                <div className="w-100">
                  <FormControl type="text" className="form-control form-control-sm" placeholder="Add a comment..." />
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={toggleDetailModal}>
          Close
        </Button>
        <Button variant="primary">Mark as Complete</Button>
      </ModalFooter>
    </Modal>;
};
export default TaskDetailModal;