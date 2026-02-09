import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import { Button, Card, CardBody, Col, Form, FormControl, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
import { useToggle } from 'usehooks-ts';
import { bankAccountData } from './data';
const BankAccount = () => {
  const [isOpen, toggleOpen] = useToggle(false);
  return <>
      <Row className="mb-2">
        <Col xs="12" className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-semibold fs-base text-muted text-uppercase mb-0">Bank Accounts</h5>
          <Button variant="primary" size="sm" onClick={toggleOpen}>
            <Icon icon="plus" className="me-1" /> Add Bank
          </Button>
        </Col>

        {bankAccountData.map((bank, index) => <Col md={6} xxl={4} key={index}>
            <Card className="border border-dashed shadow-none">
              <CardBody className="d-flex justify-content-between">
                <div className="d-flex gap-3">
                  <div className="avatar avatar-lg flex-shrink-0">
                    <span className={`avatar-title rounded-circle fs-24 ${bank.iconClassName}`}>
                      <Icon icon={bank.icon} />
                    </span>
                  </div>

                  <div>
                    <h5 className="fw-semibold mb-1">{bank.name}</h5>
                    <p className="text-muted mb-3 fs-sm">Balance: {bank.balance} USD</p>
                    <ul className="list-unstyled mb-0">
                      <li>
                        <strong className="text-muted">Account Holder:</strong> {bank.holder}
                      </li>
                      <li>
                        <strong className="text-muted">Account No:</strong> {bank.accountNo}
                      </li>
                      <li>
                        <strong className="text-muted">Account Type:</strong> {bank.type}
                      </li>
                      <li>
                        <strong className="text-muted">Branch:</strong> {bank.branch}
                      </li>
                    </ul>
                    <div className="mt-3 d-flex gap-1">
                      <Button variant="default" size="sm">
                        Edit
                      </Button>
                      <Button variant="default" size="sm">
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="text-end">
                  <span className={`badge ${bank.status === 'active' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} mb-2`}>{toPascalCase(bank.status)}</span>
                </div>
              </CardBody>
            </Card>
          </Col>)}
      </Row>

      <Modal show={isOpen} onHide={toggleOpen} centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5" id="addBankModalLabel">
            Add New Bank Account
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Form>
            <div className="mb-3">
              <FormLabel>Bank Name</FormLabel>
              <FormControl type="text" placeholder="Enter bank name" required />
            </div>
            <div className="mb-3">
              <FormLabel>Account Holder</FormLabel>
              <FormControl type="text" placeholder="Enter account holder name" required />
            </div>
            <div className="mb-3">
              <FormLabel>Account Number</FormLabel>
              <FormControl type="text" placeholder="Enter account number" required />
            </div>
            <div className="mb-3">
              <FormLabel>Account Type</FormLabel>
              <FormSelect required>
                <option>Select type</option>
                <option>Checking</option>
                <option>Savings</option>
                <option>Business</option>
              </FormSelect>
            </div>
            <div className="mb-3">
              <FormLabel>Branch</FormLabel>
              <FormControl type="text" placeholder="Enter branch name" required />
            </div>
            <div className="mb-3">
              <FormLabel>Balance</FormLabel>
              <FormControl type="number" placeholder="Enter balance amount" required />
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
            Save Bank
          </Button>
        </ModalFooter>
      </Modal>
    </>;
};
export default BankAccount;