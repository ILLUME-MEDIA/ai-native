import Flatpickr from '@admin/components/wrappers/Flatpickr';
import { Button, Col, Form, FormControl, FormGroup, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
const ApiModal = ({
  show,
  onHide
}) => {
  return <Modal show={show} onHide={onHide} size="lg">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Add New API Key</ModalTitle>
      </ModalHeader>

      <Form>
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormGroup controlId="clientName">
                <FormLabel>Client Name</FormLabel>
                <FormControl type="text" placeholder="Enter client name" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="createdBy">
                <FormLabel>Created By</FormLabel>
                <FormSelect defaultValue="">
                  <option disabled value="">
                    Select user
                  </option>
                  <option>Mark Reynolds</option>
                  <option>Sophia Turner</option>
                  <option>Liam Watson</option>
                  <option>Ava Turner</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="apiKey">
                <FormLabel>API Key</FormLabel>
                <div className="d-flex">
                  <FormControl type="text" placeholder="Enter or generate API key" />
                  <Button type="button" variant="secondary" className="ms-2">
                    Generate
                  </Button>
                </div>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="status">
                <FormLabel>Status</FormLabel>
                <FormSelect defaultValue="Active">
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Revoked">Revoked</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Trial">Trial</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="usageLimit">
                <FormLabel>Usage Limit</FormLabel>
                <FormControl type="text" placeholder="e.g. 1000" />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="region">
                <FormLabel>Region</FormLabel>
                <FormSelect defaultValue="IN">
                  <option value="DE">🇩🇪 Germany</option>
                  <option value="UK">🇬🇧 UK</option>
                  <option value="IN">🇮🇳 India</option>
                  <option value="US">🇺🇸 USA</option>
                  <option value="AU">🇦🇺 Australia</option>
                  <option value="CA">🇨🇦 Canada</option>
                </FormSelect>
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="createdOn">
                <FormLabel>Created On</FormLabel>
                <Flatpickr className="form-control" options={{
                dateFormat: 'd M, Y',
                defaultDate: 'today'
              }} />
              </FormGroup>
            </Col>

            <Col md={6}>
              <FormGroup controlId="expiresOn">
                <FormLabel>Expires On</FormLabel>
                <Flatpickr className="form-control" options={{
                dateFormat: 'd M, Y',
                defaultDate: 'today'
              }} />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add API Key
          </Button>
        </ModalFooter>
      </Form>
    </Modal>;
};
export default ApiModal;