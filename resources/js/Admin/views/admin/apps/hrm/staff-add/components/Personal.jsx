import Flatpickr from '@admin/components/wrappers/Flatpickr';
import { Col, FormControl, FormLabel, FormSelect, Row } from 'react-bootstrap';
const Personal = () => {
  return <>
      <Row className="g-3">
        <Col md="4">
          <FormLabel>First Name</FormLabel>
          <FormControl id="firstName" type="text" required />
        </Col>
        <Col md="4">
          <FormLabel>Last Name</FormLabel>
          <FormControl id="lastName" type="text" required />
        </Col>
        <Col md="4">
          <FormLabel>Email</FormLabel>
          <FormControl id="email" type="email" required />
        </Col>
        <Col md="4">
          <FormLabel>Phone</FormLabel>
          <FormControl id="phone" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>Gender</FormLabel>
          <FormSelect>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </FormSelect>
        </Col>
        <Col md="4">
          <FormLabel>Date of Birth</FormLabel>
          <Flatpickr className="form-control" required />
        </Col>
        <Col md="4">
          <FormLabel>Marital Status</FormLabel>
          <FormSelect>
            <option>Single</option>
            <option>Married</option>
            <option>Divorced</option>
          </FormSelect>
        </Col>
        <Col md="4">
          <FormLabel>Nationality</FormLabel>
          <FormControl id="nationality" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>Blood Group</FormLabel>
          <FormSelect>
            <option>O+</option>
            <option>O-</option>
            <option>A+</option>
            <option>A-</option>
            <option>B+</option>
            <option>B-</option>
            <option>AB+</option>
            <option>AB-</option>
          </FormSelect>
        </Col>
        <Col md="12">
          <FormLabel>Address</FormLabel>
          <textarea id="address" className="form-control" rows={2} />
        </Col>
        <Col md="4">
          <FormLabel>City</FormLabel>
          <FormControl id="city" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>State</FormLabel>
          <FormControl id="state" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>Country</FormLabel>
          <FormControl id="country" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>Postal Code</FormLabel>
          <FormControl id="postalCode" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>ID Type</FormLabel>
          <FormSelect>
            <option>Passport</option>
            <option>National ID</option>
            <option>Driving License</option>
          </FormSelect>
        </Col>
        <Col md="4">
          <FormLabel>ID Number</FormLabel>
          <FormControl id="idNumber" type="text" />
        </Col>
      </Row>
    </>;
};
export default Personal;