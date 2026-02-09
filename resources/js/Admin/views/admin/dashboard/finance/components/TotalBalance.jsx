import debit from '@admin/assets/images/debit-card.png';
import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import { useState } from 'react';
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
const TotalBalance = () => {
  const [showBalance, setShowBalance] = useState(true);
  return <>
      <Card className='card-h-100'>
        <CardHeader className="border-0 justify-content-between">
          <CardTitle as="h4">Total Balance</CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="wallet" className="me-2" /> Add Funds
              </DropdownItem>
              <DropdownItem>
                <Icon icon="money-out" className="me-2" /> Withdraw Funds
              </DropdownItem>
              <DropdownItem>
                <Icon icon="transaction" className="me-2" /> Transaction History
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem className="text-danger">
                <Icon icon="lock" className="me-2" /> Freeze Account
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody className="pt-0">
          <h2 className="fw-bold" id="user-balance-data">
            <span id="user-balance-number">{showBalance ? '$76,852.36' : '$*********'}</span>&nbsp;
            <a type="button" onClick={() => setShowBalance(!showBalance)} className="cursor-pointer" aria-label="Toggle balance visibility">
              {showBalance ? <Icon icon="eye-off" className="text-muted fs-xxl" /> : <Icon icon="eye" className="text-warning fs-xxl" />}
            </a>
          </h2>
          <div className="p-2 bg-light bg-opacity-50 rounded mt-3 gap-2 d-flex align-items-center">
            <img src={debit} alt="" height={36} className="rounded me-1" />
            <div>
              <p className="mb-0 fw-semibold">
                <CountUp end={59258.25} start={0} duration={10} decimals={2} decimal="." prefix="$" />
              </p>
              <p className="text-muted fs-12 mb-0">**** **** **** 3698 </p>
            </div>
            <a href="" className="btn btn-link fw-medium text-reset ms-auto text-decoration-underline link-offset-2">
              Details
            </a>
          </div>
          <Row className="g-2 mt-3">
            <Col>
              <Button variant="secondary" className="bg-gradient w-100">
                <Icon icon="coin" className="me-1" /> Transfer
              </Button>
            </Col>
            <Col>
              <Button variant="info" className="bg-gradient w-100">
                <Icon icon="coin" className="me-1" /> Request
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </>;
};
export default TotalBalance;