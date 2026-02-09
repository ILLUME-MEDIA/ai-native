import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import Detail from './components/Detail';
const Page = () => {
  return <>
      <PageBreadcrumb title="Add Staff" subtitle="HRM" />
      <Row>
        <Col xs="12">
          <Detail />
        </Col>
      </Row>
    </>;
};
export default Page;