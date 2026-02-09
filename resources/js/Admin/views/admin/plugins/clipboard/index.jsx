import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import Clipboard from './components/Clipboard';
const Page = () => {
  return <>
      <PageBreadcrumb title="Clipboard" subtitle="Plugins" />

      <Row className="justify-content-center">
        <Col lg={12}>
          <Clipboard />
        </Col>
      </Row>
    </>;
};
export default Page;