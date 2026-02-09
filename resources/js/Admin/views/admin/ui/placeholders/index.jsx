import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import { AnimationPlaceholder, ColorPlaceholders, DefaultPlaceholders, SizingPlaceholders, WidthPlaceholders, WorksPlaceholder } from './components/Placeholders';
const Page = () => {
  return <>
      <PageBreadcrumb title="Placeholders" subtitle="UI" />
      <Row>
        <Col xl={6}>
          <DefaultPlaceholders />
        </Col>
        <Col xl={6}>
          <ColorPlaceholders />
        </Col>
        <Col xl={6}>
          <WidthPlaceholders />
        </Col>
        <Col xl={6}>
          <SizingPlaceholders />
        </Col>
        <Col xl={6}>
          <WorksPlaceholder />
        </Col>
        <Col xl={6}>
          <AnimationPlaceholder />
        </Col>
      </Row>
    </>;
};
export default Page;