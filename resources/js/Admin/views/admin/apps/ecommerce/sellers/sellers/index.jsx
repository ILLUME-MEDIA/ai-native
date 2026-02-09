import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import SellerTable from './components/SellerTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Sellers" subtitle="Ecommerce" />
      <Row className="justify-content-center">
        <Col xs={12}>
          <SellerTable />
        </Col>
      </Row>
    </>;
};
export default Page;