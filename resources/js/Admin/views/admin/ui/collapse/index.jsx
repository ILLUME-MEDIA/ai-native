import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import { CollapseHorizontal, DefaultCollapse, MultipleTargets } from './components/Collapse';
const Page = () => {
  return <>
      <PageBreadcrumb title="Collapse" subtitle="UI" />
      <Row>
        <Col xl={6}>
          <DefaultCollapse />
          <MultipleTargets />
        </Col>
        <Col xl={6}>
          <CollapseHorizontal />
        </Col>
      </Row>
    </>;
};
export default Page;