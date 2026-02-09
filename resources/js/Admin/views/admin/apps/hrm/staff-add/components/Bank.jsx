import { Col, FormControl, FormLabel, FormSelect, Row } from 'react-bootstrap';
const Bank = () => {
  return <>
      <Row className="g-3">
        <Col md="4">
          <FormLabel>Bank Name</FormLabel>
          <FormControl id="bankName" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>Account Number</FormLabel>
          <FormControl id="accountNumber" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>IFSC / SWIFT Code</FormLabel>
          <FormControl id="ifscCode" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>Branch</FormLabel>
          <FormControl id="branch" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>PAN / Tax ID</FormLabel>
          <FormControl id="taxId" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>Salary (Monthly)</FormLabel>
          <FormControl id="salary" type="number" placeholder="USD $" />
        </Col>
        <Col md="4">
          <FormLabel>Payment Mode</FormLabel>
          <FormSelect>
            <option>Bank Transfer</option>
            <option>Cheque</option>
            <option>Cash</option>
          </FormSelect>
        </Col>
        <Col md="4">
          <FormLabel>PF Number</FormLabel>
          <FormControl id="pfNumber" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>ESI Number</FormLabel>
          <FormControl id="esiNumber" type="text" />
        </Col>
      </Row>
    </>;
};
export default Bank;