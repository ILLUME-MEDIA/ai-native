import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import RenderingTable from './components/RenderingTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Data Rendering" subtitle="DataTables" />
      <Row className="justify-content-center">
        <Col xs={12}>
          <RenderingTable />
        </Col>
      </Row>
    </>;
};
export default Page;