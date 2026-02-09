import Flatpickr from '@admin/components/wrappers/Flatpickr';
import { Button, Col, Form, FormControl, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
const AddCustomerModal = ({
  show,
  onHide
}) => {
  return <Modal show={show} onHide={onHide} centered size="lg" aria-labelledby="addCustomerModalLabel">
      <ModalHeader closeButton>
        <ModalTitle as="h5">Add New Customer</ModalTitle>
      </ModalHeader>

      <Form id="addCustomerForm">
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormLabel htmlFor="customerName">Full Name</FormLabel>
              <FormControl type="text" id="customerName" placeholder="e.g. Carlos Méndez" required />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="customerEmail">Email</FormLabel>
              <FormControl type="email" id="customerEmail" placeholder="e.g. carlos@domain.com" required />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="customerPhone">Phone</FormLabel>
              <FormControl type="tel" id="customerPhone" placeholder="+1 (415) 992-3412" required />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="customerCountry">Country</FormLabel>
              <FormSelect id="customerCountry" defaultValue="" required>
                <option value="" disabled>
                  Select Country
                </option>
                <option value="United States">🇺🇸 United States</option>
                <option value="Canada">🇨🇦 Canada</option>
                <option value="United Kingdom">🇬🇧 United Kingdom</option>
                <option value="India">🇮🇳 India</option>
              </FormSelect>
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="customerAvatar">Avatar</FormLabel>
              <FormControl type="file" id="customerAvatar" accept="image/*" />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="joinedDate">Join Date</FormLabel>
              <Flatpickr className="form-control" options={{
              dateFormat: 'd M, Y',
              defaultDate: 'today'
            }} required />
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add Customer
          </Button>
        </ModalFooter>
      </Form>
    </Modal>;
};
export default AddCustomerModal;