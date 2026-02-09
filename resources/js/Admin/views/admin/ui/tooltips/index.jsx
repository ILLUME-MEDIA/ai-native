import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import { BasicTooltips, ColorTooltips, DisabledElements, FourDirections, HoverElements, HTMLTags } from './components/Tooltip';
const Page = () => {
  return <>
      <PageBreadcrumb title="Tooltips" subtitle="UI" />
      <Row>
        <Col xl={6}>
          <BasicTooltips />
          <DisabledElements />
          <HoverElements />
        </Col>
        <Col xl={6}>
          <FourDirections />
          <HTMLTags />
          <ColorTooltips />
        </Col>
      </Row>
    </>;
};
export default Page;