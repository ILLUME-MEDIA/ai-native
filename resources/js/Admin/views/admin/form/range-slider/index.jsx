import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import RangeSlider from './components/RangeSlider';
const Page = () => {
  return <>
      <PageBreadcrumb title="Range Slider" subtitle="Forms" />

      <Row>
        <Col xs="12">
          <RangeSlider />
        </Col>
      </Row>
    </>;
};
export default Page;