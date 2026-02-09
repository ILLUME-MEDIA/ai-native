import Flatpickr from '@admin/components/wrappers/Flatpickr';
import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
import ReactDatePicker from 'react-datepicker';
const DataPicker = () => {
  return <>
      <Card>
        <CardHeader>
          <CardTitle as="h4">Date Range Picker</CardTitle>
        </CardHeader>

        <CardBody>
          <DateRange />

          <div className="my-4 border-top border-dashed" />

          <DateRangeWithTime />

          <div className="my-4 border-top border-dashed" />

          <SingleDate />

          <div className="my-4 border-top border-dashed" />

          <TimeOnlyDatePicker />
        </CardBody>
      </Card>
    </>;
};
const DateRange = () => {
  return <>
      <Row className="g-3">
        <Col lg={6}>
          <h5>Date Range</h5>
          <p className="text-muted mb-0">Select a custom date range from the calendar.</p>
        </Col>
        <Col lg={6}>
          <Flatpickr className="form-control" options={{
          dateFormat: 'd/m/Y',
          defaultDate: 'today'
        }} />
        </Col>
      </Row>
    </>;
};
const DateRangeWithTime = () => {
  return <>
      <Row className="g-3">
        <Col lg={6}>
          <h5>Date Range Picker With Times</h5>
        </Col>
        <Col lg={6}>
          <Flatpickr className="form-control" options={{
          dateFormat: 'd/m h:m K',
          enableTime: true,
          defaultDate: 'today'
        }} />
        </Col>
      </Row>
    </>;
};
const SingleDate = () => {
  return <>
      <Row className="g-3">
        <Col lg={6}>
          <h5>Single Date Picker</h5>
          <p className="text-muted mb-0">Select a single date (e.g., birthday).</p>
        </Col>
        <Col lg={6}>
          <Flatpickr className="form-control" options={{
          dateFormat: 'd/m/Y',
          defaultDate: 'today'
        }} />
        </Col>
      </Row>
    </>;
};
const TimeOnlyDatePicker = () => {
  const [selected, setSelected] = useState(new Date());
  return <Row className="g-4">
      <Col lg={6}>
        <h5>Time Only</h5>
        Set prop <code>showTimeSelect</code>, <code>showTimeSelectOnly</code> and <code>dateFormat=&quot;h:mm aa&quot;</code>
      </Col>
      <Col lg={6}>
        <ReactDatePicker className="form-control" selected={selected} onChange={date => setSelected(date)} showTimeSelect showTimeSelectOnly dateFormat="h:mm aa" />
      </Col>
    </Row>;
};
export default DataPicker;