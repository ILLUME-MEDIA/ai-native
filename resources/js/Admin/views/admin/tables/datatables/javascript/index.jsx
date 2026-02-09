import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import JsTable from './components/JsTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Javascript Source" subtitle="DataTables" />
      <Row className="justify-content-center">
        <Col xs={12}>
          <JsTable />
        </Col>
      </Row>
    </>;
};
export default Page;