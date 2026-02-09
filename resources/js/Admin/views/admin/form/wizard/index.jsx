import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import BasicWizard from './components/BasicWizard';
const Page = () => {
  return <>
      <PageBreadcrumb title="Wizard" subtitle="Forms" />

      <Row className="justify-content-center">
        <Col xs={12}>
          <BasicWizard />
        </Col>
      </Row>
    </>;
};
export default Page;