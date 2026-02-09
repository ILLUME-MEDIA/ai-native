import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import ReactInputMask from './components/ReactInputMask';
import ReactTypeahead from './components/ReactTypeahead';
import TouchSpin from './components/TouchSpin';
const Page = () => {
  return <>
      <PageBreadcrumb title="Other Plugins" subtitle="Forms" />
      <Row>
        <Col xs="12">
          <ReactInputMask />
          <ReactTypeahead />
          <TouchSpin />
        </Col>
      </Row>
    </>;
};
export default Page;