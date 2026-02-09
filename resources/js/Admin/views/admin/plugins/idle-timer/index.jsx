import { Col, Row } from 'react-bootstrap';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import IdleTracker from './components/IdleTracker';
const Page = () => {
  return <>
      <PageBreadcrumb title="Idle Timer" subtitle="Miscellaneous" />

      <Row className="justify-content-center">
        <Col xs={12}>
          <IdleTracker />
        </Col>
      </Row>
    </>;
};
export default Page;