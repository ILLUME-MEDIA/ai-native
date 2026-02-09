import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import ProductReviews from './components/ProductReviews';
const Page = () => {
  return <>
      <PageBreadcrumb title="Reviews" subtitle="Ecommerce" />
      <Row className="justify-content-center">
        <Col xs={12}>
          <ProductReviews />
        </Col>
      </Row>
    </>;
};
export default Page;