import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import Tasks from './components/Tasks';
const Page = () => {
  return <>
      <PageBreadcrumb title="Tasks" subtitle="Apps" />
      <Row>
        <Col xs={12}>
          <Tasks />
        </Col>
      </Row>
    </>;
};
export default Page;