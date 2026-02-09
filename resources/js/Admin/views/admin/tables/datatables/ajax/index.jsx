import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import AjaxTable from './components/AjaxTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Ajax" subtitle="DataTables" />

      <Row className="justify-content-center">
        <Col xs={12}>
          <AjaxTable />
        </Col>
      </Row>
    </>;
};
export default Page;