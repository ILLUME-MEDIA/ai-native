import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import Flags from './components/Flags';
const Page = () => {
  return <>
      <PageBreadcrumb title="Flags" subtitle="Icons" />
      <Row>
        <Col xs={12}>
          <Flags />
        </Col>
      </Row>
    </>;
};
export default Page;