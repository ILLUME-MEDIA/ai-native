import Flatpickr from '@admin/components/wrappers/Flatpickr';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Form, FormControl, FormSelect, InputGroup, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from 'react-bootstrap';
const CreateRefundModal = ({
  show,
  onHide
}) => {
  return <Modal show={show} onHide={onHide} centered>
      <ModalHeader closeButton>
        <ModalTitle as="h5" className="fw-semibold">
          <Icon icon="credit-card" className="me-2 text-primary" /> Create Refund
        </ModalTitle>
      </ModalHeader>

      <Form method="post">
        <ModalBody>
          <div className="mb-3">
            <label htmlFor="refundOrderId" className="form-label fw-semibold">
              Order ID
            </label>
            <FormSelect id="refundOrderId">
              <option disabled>Select Order</option>
              <option>#INV-10423</option>
              <option>#INV-10424</option>
              <option>#INV-10425</option>
            </FormSelect>
          </div>

          <div className="mb-3">
            <label htmlFor="refundCustomer" className="form-label fw-semibold">
              Customer
            </label>
            <FormControl id="refundCustomer" type="text" defaultValue="Mason Carter" readOnly />
          </div>

          <div className="mb-3">
            <label htmlFor="refundReason" className="form-label fw-semibold">
              Reason
            </label>
            <textarea className="form-control" id="refundReason" rows={2} placeholder="Enter refund reason (e.g., damaged item, wrong product, etc.)" />
          </div>

          <div className="mb-3">
            <label htmlFor="refundMethod" className="form-label fw-semibold">
              Refund Method
            </label>
            <FormSelect id="refundMethod" defaultValue="Original Payment Method (Visa ****7832)">
              <option>Original Payment Method (Visa ****7832)</option>
              <option>Store Credit</option>
              <option>Bank Transfer</option>
            </FormSelect>
          </div>

          <div className="mb-3">
            <label htmlFor="refundAmount" className="form-label fw-semibold">
              Refund Amount
            </label>
            <InputGroup>
              <InputGroup.Text>$</InputGroup.Text>
              <FormControl id="refundAmount" type="number" placeholder="129.45" defaultValue="129.45" />
            </InputGroup>
          </div>

          <div>
            <label htmlFor="refundDate" className="form-label fw-semibold">
              Refund Date
            </label>
            <Flatpickr options={{
            dateFormat: 'd M, Y',
            defaultDate: 'today'
          }} className="form-control" />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            <Icon icon="check" className="me-1" /> Confirm Refund
          </Button>
        </ModalFooter>
      </Form>
    </Modal>;
};
export default CreateRefundModal;