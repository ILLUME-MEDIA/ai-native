import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import ProductViewsTable from './components/ProductViewsTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Product Views" subtitle="Ecommerce" />
      <Row className="justify-content-center">
        <Col xs={12}>
          <ProductViewsTable />
        </Col>
      </Row>
    </>;
};
export default Page;