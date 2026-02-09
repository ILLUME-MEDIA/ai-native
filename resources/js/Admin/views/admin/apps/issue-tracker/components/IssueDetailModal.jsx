import { Button, Col, ListGroup, ListGroupItem, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, ProgressBar, Row } from 'react-bootstrap';
import user1 from '@admin/assets/images/users/user-1.jpg';
const IssueDetailModal = ({
  show,
  onHide
}) => {
  const files = [{
    name: 'profile-update-bug.txt'
  }, {
    name: 'screenshot-mobile.png'
  }];
  return <Modal show={show} onHide={onHide} aria-labelledby="issueDetailsModalLabel" dialogClassName="modal-lg modal-dialog-centered modal-dialog-scrollable" centered scrollable>
      <ModalHeader closeButton>
        <ModalTitle id="issueDetailsModalLabel" className="fw-bold">
          Issue Details
        </ModalTitle>
      </ModalHeader>

      <ModalBody>
        <div className="d-flex align-items-center gap-2 mb-3">
          <span className="badge bg-warning-subtle text-warning px-2 py-1 rounded-pill fs-xs">In Progress</span>
          <h5 className="mb-0 fw-semibold">ISSUE-104 — User profile update not saving on mobile devices</h5>
        </div>

        <div className="d-flex align-items-center mb-3">
          <img src={user1} className="rounded-circle me-2" width="40" height="40" alt="User" />
          <div>
            <h5 className="mb-0">Jason Lee</h5>
            <small className="text-muted">Assigned User</small>
          </div>
        </div>

        <Row className="mb-3">
          <Col md={4}>
            <strong>Created:</strong> 10 Feb 2025
          </Col>

          <Col md={4}>
            <strong>Due:</strong> 15 Feb 2025
          </Col>

          <Col md={4}>
            <div className="mb-1">
              <span className="badge badge-label text-bg-light fs-xxs">Mobile</span>
              <span className="badge badge-label text-bg-light fs-xxs ms-1">UI</span>
              <span className="badge bg-light text-danger fs-xxs ms-1">Urgent</span>
            </div>
          </Col>
        </Row>

        <p className="text-muted">User profile update is not saving correctly on mobile devices. This issue occurs on iOS Safari and Android Chrome. Needs urgent fix before next release.</p>

        <div className="mb-3">
          <div className="d-flex justify-content-between">
            <small className="mb-2 text-uppercase">Progress</small>
            <small className="fw-bold text-warning">60% Complete</small>
          </div>
          <ProgressBar now={60} variant="warning" style={{
          height: 6
        }} />
        </div>

        <Row className="text-center mb-3">
          <Col md={6}>
            <span data-icon="chat" className="me-1"></span>
            <strong>12 Comments</strong>
          </Col>
          <Col md={6}>
            <span data-icon="paperclip" className="me-1"></span>
            <strong>3 Files Attached</strong>
          </Col>
        </Row>

        <ListGroup className="mb-3">
          {files.map(file => <ListGroupItem key={file.name} className="d-flex justify-content-between align-items-center">
              <span>{file.name}</span>
              <Button size="sm" variant="outline-primary">
                Download
              </Button>
            </ListGroupItem>)}
        </ListGroup>
      </ModalBody>

      <ModalFooter>
        <Button variant="light" onClick={onHide}>
          Close
        </Button>
        <Button variant="primary">Edit Issue</Button>
        <Button variant="danger">Delete Issue</Button>
      </ModalFooter>
    </Modal>;
};
export default IssueDetailModal;