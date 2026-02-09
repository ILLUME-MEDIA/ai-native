import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import RowAdd from './components/RowAdd';
const Page = () => {
  return <>
      <PageBreadcrumb title="Add Rows" subtitle="DataTables" />
      <Row className="justify-content-center">
        <Col xs={12}>
          <RowAdd />
        </Col>
      </Row>
    </>;
};
export default Page;