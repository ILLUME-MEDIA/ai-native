import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import CustomerTable from './components/CustomerTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Customers" subtitle="CRM" />
      <Row>
        <Col xs="12">
          <CustomerTable />
        </Col>
      </Row>
    </>;
};
export default Page;