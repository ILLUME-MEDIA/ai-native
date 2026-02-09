import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import Example from './components/ColumnTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Column Searching" subtitle="DataTables" />
      <Row className="justify-content-center">
        <Col xs="12">
          <Example />
        </Col>
      </Row>
    </>;
};
export default Page;