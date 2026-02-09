import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import PayRollTable from './components/PayRollTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Payroll" subtitle="HRM" />
      <Row>
        <Col xs="12">
          <PayRollTable />
        </Col>
      </Row>
    </>;
};
export default Page;