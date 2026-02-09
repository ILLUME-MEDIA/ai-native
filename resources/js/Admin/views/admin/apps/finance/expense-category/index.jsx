import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import CategoryTable from './components/CategoryTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Expense Category" subtitle="Finance" />
      <Row>
        <Col xs="12">
          <CategoryTable />
        </Col>
      </Row>
    </>;
};
export default Page;