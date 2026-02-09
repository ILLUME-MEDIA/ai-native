import Flatpickr from '@admin/components/wrappers/Flatpickr';
import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { Button, Card, CardBody, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Form, FormControl, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
import { useToggle } from 'usehooks-ts';
import { paymentCardData } from './data';
const BankCard = () => {
  const [isOpen, toggleOpen] = useToggle(false);
  return <>
      <Row>
        <Col xs="12" className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-semibold fs-base text-muted text-uppercase mb-0">Cards</h5>
          <Button variant="primary" size="sm" onClick={toggleOpen}>
            <Icon icon="plus" className="me-1" /> Add Card
          </Button>
        </Col>
        {paymentCardData.map((card, index) => <Col md="6" xxl="3" key={index}>
            <Card className="border border-dashed shadow-none">
              <CardBody>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <img src={card.image} alt={card.brand} height={36} />
                  <span className={`badge ${card.status === 'active' ? 'bg-success-subtle text-success' : card.status === 'inactive' ? 'bg-warning-subtle text-warning' : card.status === 'expired' ? 'bg-danger-subtle text-danger' : 'bg-secondary-subtle text-secondary'}`}>
                    {toPascalCase(card.status)}
                  </span>
                </div>
                <h4 className="fw-semibold mt-3">{card.number}</h4>
                <p className="text-muted fs-sm mb-0">Exp: {card.expiryDate}</p>
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <span className="fw-medium text-dark">{card.holder}</span>
                  <Dropdown>
                    <DropdownToggle size="sm" variant="light" className="btn-icon rounded-circle content-none">
                      <Icon icon="dots-vertical" />
                    </DropdownToggle>
                    <DropdownMenu align="end">
                      <DropdownItem>Set as Default</DropdownItem>
                      <DropdownItem>Edit</DropdownItem>
                      <DropdownItem className="text-danger">Remove</DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </CardBody>
            </Card>
          </Col>)}
      </Row>

      <Modal show={isOpen} onHide={toggleOpen} centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5" id="addCardModalLabel">
            Add New Card
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Form>
            <div className="mb-3">
              <FormLabel>Card Holder Name</FormLabel>
              <FormControl type="text" placeholder="Enter card holder name" required />
            </div>
            <div className="mb-3">
              <FormLabel>Card Number</FormLabel>
              <FormControl type="text" placeholder="XXXX XXXX XXXX XXXX" required />
            </div>
            <div className="mb-3">
              <FormLabel>Card Type</FormLabel>
              <FormSelect required>
                <option>Select type</option>
                <option>Credit Card</option>
                <option>Debit Card</option>
                <option>Prepaid Card</option>
              </FormSelect>
            </div>
            <div className="mb-3">
              <FormLabel>Expiry Date</FormLabel>
              <Flatpickr type="text" className="form-control" required />
            </div>
            <div className="mb-3">
              <FormLabel>CVV</FormLabel>
              <FormControl type="password" placeholder="***" maxLength={3} required />
            </div>
            <div className="mb-3">
              <FormLabel>Bank Name</FormLabel>
              <FormControl type="text" placeholder="Enter bank name" required />
            </div>
            <div className="mb-3">
              <FormLabel>Status</FormLabel>
              <FormSelect>
                <option>Active</option>
                <option>Inactive</option>
              </FormSelect>
            </div>
          </Form>
        </ModalBody>
        <ModalFooter className="border-0 pt-0">
          <Button variant="light" type="button" onClick={toggleOpen}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Save Card
          </Button>
        </ModalFooter>
      </Modal>
    </>;
};
export default BankCard;