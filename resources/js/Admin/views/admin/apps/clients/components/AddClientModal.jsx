import Flatpickr from '@admin/components/wrappers/Flatpickr';
import { Button, Col, Form, FormControl, FormGroup, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
const AddClientModal = ({
  show,
  onHide
}) => {
  return <Modal size="lg" centered show={show} onHide={onHide} className="fade" aria-labelledby="addClientModalLabel">
      <ModalHeader closeButton>
        <ModalTitle as="h5" id="addClientModalLabel" className="fw-bold text-uppercase">
          Add New Client
        </ModalTitle>
      </ModalHeader>

      <Form id="addClientForm">
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup controlId="clientName">
                <FormLabel>Client Name</FormLabel>
                <FormControl type="text" name="client_name" placeholder="Enter full name" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="clientEmail">
                <FormLabel>Email</FormLabel>
                <FormControl type="email" name="email" placeholder="client@example.com" required />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="clientPhone">
                <FormLabel>Phone</FormLabel>
                <FormControl type="tel" name="phone" placeholder="+1 (000) 000-0000" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="clientCountry">
                <FormLabel>Country</FormLabel>
                <FormSelect name="country" required>
                  <option value="">Select country...</option>
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="DE">Germany</option>
                  <option value="MX">Mexico</option>
                  <option value="IN">India</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="clientEnrolled">
                <FormLabel>Enrolled Date</FormLabel>
                <Flatpickr options={{
                dateFormat: 'F j, Y',
                defaultDate: 'today'
              }} name="enrolled_date" className="flatpickr-input form-control" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="clientType">
                <FormLabel>Type</FormLabel>
                <FormSelect name="type" required>
                  <option value="">Select type...</option>
                  <option value="Project">Project</option>
                  <option value="Contract">Contract</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="clientJobTitle">
                <FormLabel>Job Title</FormLabel>
                <FormControl type="text" name="job_title" placeholder="Frontend Developer" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="clientStatus">
                <FormLabel>Status</FormLabel>
                <FormSelect name="status" defaultValue="Pending">
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Inactive">Inactive</option>
                </FormSelect>
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Add Client
          </Button>
        </ModalFooter>
      </Form>
    </Modal>;
};
export default AddClientModal;