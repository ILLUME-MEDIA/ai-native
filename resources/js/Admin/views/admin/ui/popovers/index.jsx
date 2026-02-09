import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import { CustomPopovers, DisabledPopover, DismissOnPopover, FourDirections, HoverPopovers, SimplePopover } from './components/PopOver';
const Page = () => {
  return <>
      <PageBreadcrumb title="Popovers" subtitle="UI" />
      <Row>
        <Col xl={6}>
          <SimplePopover />
          <HoverPopovers />
          <CustomPopovers />
        </Col>
        <Col xl={6}>
          <DismissOnPopover />
          <FourDirections />
          <DisabledPopover />
        </Col>
      </Row>
    </>;
};
export default Page;