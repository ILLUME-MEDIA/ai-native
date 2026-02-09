import { Col, FormControl, FormLabel, FormSelect, Row } from 'react-bootstrap';
const Access = () => {
  return <>
      <Row className="g-3">
        <Col md="4">
          <FormLabel>Username</FormLabel>
          <FormControl id="username" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>Password</FormLabel>
          <FormControl id="password" type="password" />
        </Col>
        <Col md="4">
          <FormLabel>Role</FormLabel>
          <FormSelect>
            <option>Admin</option>
            <option>Manager</option>
            <option>Staff</option>
            <option>HR</option>
          </FormSelect>
        </Col>
        <Col md="4">
          <FormLabel>Status</FormLabel>
          <FormSelect>
            <option>Active</option>
            <option>Inactive</option>
            <option>Suspended</option>
          </FormSelect>
        </Col>
        <Col md="12">
          <div className="form-check">
            <input id="sendCredentials" className="form-check-input" type="checkbox" />
            <label htmlFor="sendCredentials" className="form-check-label">
              Send login credentials to staff via email
            </label>
          </div>
        </Col>
      </Row>
    </>;
};
export default Access;