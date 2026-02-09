import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import Table from './components/Table';
const Page = () => {
  return <>
      <PageBreadcrumb title="Range Search" subtitle="DataTables" />

      <Row className="justify-content-center">
        <Col xs="12">
          <Table />
        </Col>
      </Row>
    </>;
};
export default Page;