import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import Invoices from './components/Invoices';
const Page = () => {
  return <>
      <PageBreadcrumb title="Invoice List" subtitle="Invoices" />

      <Row>
        <Col xs="12">
          <Invoices />
        </Col>
      </Row>
    </>;
};
export default Page;