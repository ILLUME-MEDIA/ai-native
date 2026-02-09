import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import { BootstrapModal, FullscreenModal, ModalPosition, MultipleModal, StaticBackdrop, ToggleBetweenModals, VaryingModalContent } from './components/Modals';
const Page = () => {
  return <>
      <PageBreadcrumb title="Modals" subtitle="UI" />
      <Row>
        <Col xl={12}>
          <BootstrapModal />
        </Col>

        <Col xl={12}>
          <ModalPosition />
        </Col>

        <Col xl={12}>
          <MultipleModal />
        </Col>

        <Col xl={12}>
          <ToggleBetweenModals />
        </Col>

        <Col xl={12}>
          <FullscreenModal />
        </Col>

        <Col xl={12}>
          <StaticBackdrop />
        </Col>

        <Col xl={12}>
          <VaryingModalContent />
        </Col>
      </Row>
    </>;
};
export default Page;