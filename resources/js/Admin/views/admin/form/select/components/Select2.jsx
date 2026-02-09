import Select from '@admin/components/wrappers/Select';
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
import { basicOptions, groupedOptions } from './data';
const Select2 = () => {
  return <>
      <Card>
        <CardHeader>
          <CardTitle as="h4">Select2</CardTitle>
        </CardHeader>
        <CardBody>
          <Row className="g-4">
            <Col lg={6}>
              <h5>Single Select Input with Button</h5>
              <p className="text-muted mb-0">An example of a select dropdown with an appended button using Select2.</p>
            </Col>
            <Col lg={6}>
              <Select className="react-select select2" classNamePrefix="react-select" placeholder="Select City" options={basicOptions} />
            </Col>
          </Row>
          <div className="my-4 border-top border-dashed" />

          <Row className="g-4">
            <Col lg={6}>
              <h5>Single Select Input with Groups</h5>
              <p className="text-muted mb-0">Select2 can take a regular select box with optgroup support for better organization.</p>
            </Col>
            <Col lg={6}>
              <Select className="react-select select2" classNamePrefix="react-select" placeholder="Select City" options={groupedOptions} />
            </Col>
          </Row>
          <div className="my-4 border-top border-dashed" />

          <Row className="g-4">
            <Col lg={6}>
              <h5>Multiple Select Input</h5>
              <p className="text-muted mb-0">Select2 multiple select with grouped options and placeholder.</p>
            </Col>
            <Col lg={6}>
              <Select isClearable isMulti className="react-select select2 select2-multiple" classNamePrefix="react-select" placeholder="Select City" options={groupedOptions} />
            </Col>
          </Row>
        </CardBody>
      </Card>
    </>;
};
export default Select2;