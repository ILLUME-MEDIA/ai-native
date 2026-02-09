import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import SweetAlerts from './components/SweetAlerts';
const Page = () => {
  return <>
      <PageBreadcrumb title="SweetAlert" subtitle="Plugins" />
      <Row className="justify-content-center">
        <Col xs={12}>
          <SweetAlerts />
        </Col>
      </Row>
    </>;
};
export default Page;