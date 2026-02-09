import { Col, FormControl, FormLabel, Row } from 'react-bootstrap';
const Emergency = () => {
  return <>
      <Row className="g-3">
        <Col md="4">
          <FormLabel>Name</FormLabel>
          <FormControl id="emergencyName" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>Relation</FormLabel>
          <FormControl id="emergencyRelation" type="text" placeholder="e.g., Mother" />
        </Col>
        <Col md="4">
          <FormLabel>Phone Number</FormLabel>
          <FormControl id="emergencyPhone" type="text" />
        </Col>
        <Col md="12">
          <FormLabel>Address</FormLabel>
          <textarea id="emergencyAddress" className="form-control" rows={2} />
        </Col>
      </Row>
    </>;
};
export default Emergency;