import Flatpickr from '@admin/components/wrappers/Flatpickr';
import { Col, FormControl, FormLabel, FormSelect, Row } from 'react-bootstrap';
const Job = () => {
  return <>
      <Row className="g-3">
        <Col md="4">
          <FormLabel>Employee ID</FormLabel>
          <FormControl id="employeeId" type="text" defaultValue="EMP-8941" placeholder="EMP-XXXX" />
        </Col>
        <Col md="4">
          <FormLabel>Department</FormLabel>
          <FormSelect>
            <option>IT</option>
            <option>HR</option>
            <option>Finance</option>
            <option>Design</option>
            <option>Sales</option>
            <option>Operations</option>
          </FormSelect>
        </Col>
        <Col md="4">
          <FormLabel>Designation</FormLabel>
          <FormControl id="designation" type="text" placeholder="e.g., Software Engineer" />
        </Col>
        <Col md="4">
          <FormLabel>Team</FormLabel>
          <FormControl id="team" type="text" />
        </Col>
        <Col md="4">
          <FormLabel>Joining Date</FormLabel>
          <Flatpickr className="form-control" required data-date-format="d M, Y" />
        </Col>
        <Col md="4">
          <FormLabel>Shift</FormLabel>
          <FormSelect>
            <option>Morning</option>
            <option>Mid Shift</option>
            <option>Night Shift</option>
          </FormSelect>
        </Col>
        <Col md="4">
          <FormLabel>Employment Type</FormLabel>
          <FormSelect>
            <option>Full-Time</option>
            <option>Part-Time</option>
            <option>Contract</option>
            <option>Intern</option>
          </FormSelect>
        </Col>
        <Col md="4">
          <FormLabel>Work Mode</FormLabel>
          <FormSelect>
            <option>Onsite</option>
            <option>Hybrid</option>
            <option>Remote</option>
          </FormSelect>
        </Col>
        <Col md="4">
          <FormLabel>Manager / Reporting To</FormLabel>
          <FormControl id="manager" type="text" />
        </Col>
      </Row>
    </>;
};
export default Job;