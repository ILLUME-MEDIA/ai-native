import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import StaffTable from './components/StaffTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Staffs" subtitle="HRM" />
      <Row>
        <Col xs="12">
          <StaffTable />
        </Col>
      </Row>
    </>;
};
export default Page;