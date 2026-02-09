import user2 from '@admin/assets/images/users/user-2.jpg';
import user3 from '@admin/assets/images/users/user-3.jpg';
import user4 from '@admin/assets/images/users/user-4.jpg';
import user5 from '@admin/assets/images/users/user-5.jpg';
import user8 from '@admin/assets/images/users/user-8.jpg';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, FormLabel, FormSelect, Row } from 'react-bootstrap';
const QuickTransfer = () => {
  return <>
      <Card>
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">
            Quick Transfer
            <i className="ti ti-info-octagon text-muted ms-1" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Quickly send money to your saved contacts." />
          </CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="user-plus" className="me-2" /> Add Recipient
              </DropdownItem>
              <DropdownItem>
                <Icon icon="history" className="me-2" /> Recent Transfers
              </DropdownItem>
              <DropdownItem>
                <Icon icon="download" className="me-2" /> Export Transfers
              </DropdownItem>
              <DropdownItem className="text-danger">
                <Icon icon="trash" className="me-2" /> Remove All
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody>
          <div className="d-flex gap-2 justify-content-center">
            <input type="radio" className="btn-check" name="recipient" id="rec1" autoComplete="off" defaultChecked />
            <label className="avatar-label" htmlFor="rec1" data-bs-toggle="tooltip" data-bs-title="Alexa Newsome">
              <img src={user4} alt="" className="rounded-circle img-thumbnail avatar-lg" />
            </label>
            <input type="radio" className="btn-check" name="recipient" id="rec2" autoComplete="off" />
            <label className="avatar-label" htmlFor="rec2" data-bs-toggle="tooltip" data-bs-title="Shelly Dorey">
              <img src={user5} alt="" className="rounded-circle img-thumbnail avatar-lg" />
            </label>
            <input type="radio" className="btn-check" name="recipient" id="rec3" autoComplete="off" />
            <label className="avatar-label" htmlFor="rec3" data-bs-toggle="tooltip" data-bs-title="Fredrick Arnett">
              <img src={user3} alt="" className="rounded-circle img-thumbnail avatar-lg" />
            </label>
            <input type="radio" className="btn-check" name="recipient" id="rec4" autoComplete="off" />
            <label className="avatar-label" htmlFor="rec4" data-bs-toggle="tooltip" data-bs-title="Barbara Frink">
              <img src={user8} alt="" className="rounded-circle img-thumbnail avatar-lg" />
            </label>
            <input type="radio" className="btn-check" name="recipient" id="rec5" autoComplete="off" />
            <label className="avatar-label" htmlFor="rec5" data-bs-toggle="tooltip" data-bs-title="Adam M">
              <img src={user2} alt="" className="rounded-circle img-thumbnail avatar-lg" />
            </label>
          </div>
          <div className="my-3">
            <FormLabel>Send From</FormLabel>
            <select id="sendFrom" className="form-select">
              <option value="visa">Visa •••• 3698</option>
              <option value="mastercard">Mastercard •••• 1425</option>
              <option value="paypal">PayPal Wallet</option>
            </select>
          </div>
          <Row className="g-3 mb-2">
            <Col xs="12" md="6">
              <FormLabel>Currency</FormLabel>
              <FormSelect>
                <option value="USD">$ USD — US Dollar</option>
                <option value="EUR">€ EUR — Euro</option>
                <option value="GBP">£ GBP — British Pound</option>
                <option value="INR">₹ INR — Indian Rupee</option>
              </FormSelect>
            </Col>
            <Col xs="12" md="6">
              <FormLabel>Amount</FormLabel>
              <input type="number" id="enterAmount" className="form-control" placeholder="0.0" min={1} step="0.01" />
            </Col>
          </Row>
          <Row className="g-2 mt-3">
            <Col>
              <Button variant="primary" className="w-100">
                Send Money
              </Button>
            </Col>
            <Col>
              <Button variant="outline-secondary" className="w-100">
                Save as Draft
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </>;
};
export default QuickTransfer;