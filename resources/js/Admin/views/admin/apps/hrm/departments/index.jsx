import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import DepartmentTable from './components/DepartmentTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Departments" subtitle="HRM" />
      <Row>
        <Col xs="12">
          <DepartmentTable />
        </Col>
      </Row>
    </>;
};
export default Page;