import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import Animations from './components/Animations';
const Page = () => {
  return <>
      <PageBreadcrumb title="Animation" subtitle="Miscellaneous" />

      <Row className="justify-content-center">
        <Col xs={12}>
          <Animations />
        </Col>
      </Row>
    </>;
};
export default Page;