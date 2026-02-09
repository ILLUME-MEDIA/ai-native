import Flatpickr from '@admin/components/wrappers/Flatpickr';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Col, Form, FormControl, FormLabel, FormSelect, InputGroup, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
const AddPurchaseModal = ({
  show,
  handleClose
}) => {
  return <Modal show={show} onHide={handleClose} centered size="lg" backdrop="static">
      <ModalHeader closeButton>
        <ModalTitle as="h5" className="fw-semibold">
          <Icon icon="file-text" className="me-2 text-danger" />
          Add New Purchase Order
        </ModalTitle>
      </ModalHeader>

      <Form>
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormLabel className="fw-semibold" htmlFor="poNumber">
                PO Number
              </FormLabel>
              <FormControl type="text" id="poNumber" placeholder="PO-2025-0149" />
            </Col>

            <Col md={6}>
              <FormLabel className="fw-semibold" htmlFor="supplierName">
                Supplier Name
              </FormLabel>
              <FormControl type="text" id="supplierName" placeholder="Global Tech Supplies" />
            </Col>

            <Col md={6}>
              <FormLabel className="fw-semibold" htmlFor="supplierEmail">
                Supplier Email
              </FormLabel>
              <FormControl type="email" id="supplierEmail" placeholder="globaltech@email.com" />
            </Col>

            <Col md={6}>
              <FormLabel className="fw-semibold" htmlFor="poItems">
                Items Count
              </FormLabel>
              <FormControl type="number" id="poItems" placeholder="10" />
            </Col>

            <Col md={6}>
              <FormLabel className="fw-semibold" htmlFor="orderDate">
                Order Date
              </FormLabel>
              <Flatpickr className="form-control" options={{
              dateFormat: 'd M, Y',
              defaultDate: 'today'
            }} />
            </Col>

            <Col md={6}>
              <FormLabel className="fw-semibold" htmlFor="deliveryDate">
                Delivery Date
              </FormLabel>
              <Flatpickr className="form-control" options={{
              dateFormat: 'd M, Y',
              defaultDate: 'today'
            }} />
            </Col>

            <Col md={6}>
              <FormLabel className="fw-semibold" htmlFor="totalAmount">
                Total Amount
              </FormLabel>
              <InputGroup>
                <InputGroup.Text>$</InputGroup.Text>
                <FormControl type="number" id="totalAmount" placeholder="3480.00" step="0.01" />
              </InputGroup>
            </Col>

            <Col md={6}>
              <FormLabel className="fw-semibold" htmlFor="paymentStatus">
                Payment Status
              </FormLabel>
              <FormSelect id="paymentStatus" defaultValue="Paid">
                <option>Paid</option>
                <option>Pending</option>
                <option>Partially Paid</option>
                <option>Unpaid</option>
              </FormSelect>
            </Col>

            <Col md={6}>
              <FormLabel className="fw-semibold" htmlFor="orderStatus">
                Order Status
              </FormLabel>
              <FormSelect id="orderStatus" defaultValue="Received">
                <option>Received</option>
                <option>Processing</option>
                <option>Dispatched</option>
                <option>Cancelled</option>
              </FormSelect>
            </Col>

            <Col md={12}>
              <FormLabel className="fw-semibold" htmlFor="poNotes">
                Additional Notes
              </FormLabel>
              <textarea className="form-control" id="poNotes" rows={2} placeholder="Add any special instructions or remarks here..." />
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger">
            <Icon icon="check" className="me-1" />
            Save Purchase Order
          </Button>
        </ModalFooter>
      </Form>
    </Modal>;
};
export default AddPurchaseModal;