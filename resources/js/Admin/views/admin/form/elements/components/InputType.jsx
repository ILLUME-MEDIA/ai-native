import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, CardHeader, CardTitle, Col, FormControl, FormLabel, InputGroup, Row } from 'react-bootstrap';
import FormRange from 'react-bootstrap/esm/FormRange';
import InputGroupText from 'react-bootstrap/esm/InputGroupText';
const InputType = () => {
  return <>
      <Card>
        <CardHeader>
          <div className="flex-grow-1">
            <CardTitle as="h4">Input Type</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <Row>
            <Col lg={6}>
              <Row className="g-lg-4 g-2 mb-3">
                <Col lg={4}>
                  <FormLabel htmlFor="example-email">Email</FormLabel>
                </Col>
                <Col lg={8}>
                  <FormControl type="email" id="example-email" name="example-email" placeholder="Email" />
                </Col>
              </Row>

              <div className="border-top border-dashed my-3" />

              <Row className="g-lg-4 g-2 mb-3">
                <Col lg={4}>
                  <FormLabel htmlFor="password">Show/Hide Password</FormLabel>
                </Col>
                <Col lg={8}>
                  <InputGroup>
                    <FormControl type="password" id="password" placeholder="Enter your password" />
                    <InputGroupText className="password-eye">
                      <Icon icon="eye" className="d-none" />
                      <Icon icon="eye-off" className="d-block" />
                    </InputGroupText>
                  </InputGroup>
                </Col>
              </Row>
              <div className="border-top border-dashed my-3" />

              <Row className="g-lg-4 g-2 mb-3">
                <Col lg={4}>
                  <FormLabel htmlFor="example-time">Time</FormLabel>
                </Col>
                <Col lg={8}>
                  <FormControl id="example-time" type="time" name="time" />
                </Col>
              </Row>
              <div className="border-top border-dashed my-3" />

              <Row className="g-lg-4 g-2 mb-3">
                <Col lg={4}>
                  <FormLabel htmlFor="example-number">Number</FormLabel>
                </Col>
                <Col lg={8}>
                  <FormControl id="example-number" type="number" name="number" />
                </Col>
              </Row>
              <div className="border-top border-dashed my-3" />

              <Row className="g-lg-4 g-2 mb-3">
                <Col lg={4}>
                  <FormLabel htmlFor="example-range">Range</FormLabel>
                </Col>
                <Col lg={8}>
                  <FormRange id="example-range" min="0" max="100" />
                </Col>
              </Row>
            </Col>

            <Col lg={6}>
              <Row className="g-lg-4 g-2 mb-3">
                <Col lg={4}>
                  <FormLabel htmlFor="example-password">Password</FormLabel>
                </Col>
                <Col lg={8}>
                  <FormControl type="password" id="example-password" value="password" onChange={() => {}} />
                </Col>
              </Row>
              <div className="border-top border-dashed my-3" />

              <Row className="g-lg-4 g-2 mb-3">
                <Col lg={4}>
                  <FormLabel htmlFor="example-month">Month</FormLabel>
                </Col>
                <Col lg={8}>
                  <FormControl id="example-month" type="month" name="month" />
                </Col>
              </Row>
              <div className="border-top border-dashed my-3" />

              <Row className="g-lg-4 g-2 mb-3">
                <Col lg={4}>
                  <FormLabel htmlFor="example-week">Week</FormLabel>
                </Col>
                <Col lg={8}>
                  <FormControl id="example-week" type="week" name="week" />
                </Col>
              </Row>
              <div className="border-top border-dashed my-3" />

              <Row className="g-lg-4 g-2 mb-3">
                <Col lg={4}>
                  <FormLabel htmlFor="example-color">Color</FormLabel>
                </Col>
                <Col lg={8}>
                  <FormControl id="example-color" type="color" name="color" value="#3b97de" onChange={() => {}} />
                </Col>
              </Row>
              <div className="border-top border-dashed my-3" />
            </Col>
          </Row>
        </CardBody>
      </Card>
    </>;
};
export default InputType;