import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import ReactSelect from './components/ReactSelect';
import Select2 from './components/Select2';
const Page = () => {
  return <>
      <PageBreadcrumb title="Select" subtitle="Forms" />

      <Row>
        <Col xs="12">
          <ReactSelect />
          <Select2 />
        </Col>
      </Row>
    </>;
};
export default Page;