import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import Example from './components/SelectTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Checkbox Select" subtitle="DataTables" />
      <Row className="justify-content-center">
        <Col xs={12}>
          <Example />
        </Col>
      </Row>
    </>;
};
export default Page;