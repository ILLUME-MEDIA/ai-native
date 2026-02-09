import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import Example from './components/BasicTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Basic" subtitle="Tables" />
      <Row className="justify-content-center">
        <Col xs={12}>
          <Example />
        </Col>
      </Row>
    </>;
};
export default Page;