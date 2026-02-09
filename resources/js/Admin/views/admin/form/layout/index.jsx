import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import LayoutForm from './components/LayoutForm';
const Page = () => {
  return <>
      <PageBreadcrumb title="Layouts" subtitle="Forms" />

      <Row>
        <Col lg={12}>
          <LayoutForm />
        </Col>
      </Row>
    </>;
};
export default Page;