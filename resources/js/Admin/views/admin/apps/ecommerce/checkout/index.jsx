import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import Checkout from './components/Checkout';
import OrderSummary from './components/OrderSummary';
const Page = () => {
  return <>
      <PageBreadcrumb title="Checkout" subtitle="Ecommerce" />
      <Row>
        <Col lg={8}>
          <Checkout />
        </Col>

        <Col lg={4}>
          <OrderSummary />

          <Card>
            <CardBody>
              <p className="text-muted mb-0">
                🎉 Congratulations! You’ve earned <span className="fw-bold text-success">239 bonus points</span>!
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Page;