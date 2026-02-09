import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import { DarkOffcanvas, DefaultOffcanvas, OffcanvasBackdrop, OffcanvasPlacement } from './components/Offcanvas';
const Page = () => {
  return <>
      <PageBreadcrumb title="Offcanvas" subtitle="UI" />
      <Row>
        <Col xl={6}>
          <DefaultOffcanvas />
        </Col>
        <Col xl={6}>
          <OffcanvasBackdrop />
        </Col>
        <Col xl={6}>
          <OffcanvasPlacement />
        </Col>
        <Col xl={6}>
          <DarkOffcanvas />
        </Col>
      </Row>
    </>;
};
export default Page;