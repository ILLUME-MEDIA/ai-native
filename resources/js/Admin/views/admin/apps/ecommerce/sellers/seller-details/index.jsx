import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import { sellerStatData } from './components/data';
import SellerContact from './components/SellerContact';
import SellerOverview from './components/SellerOverview';
import SellerProducts from './components/SellerProducts';
import SellerStatisticCard from './components/SellerStatisticCard';
const Page = () => {
  return <>
      <PageBreadcrumb title="Seller Details" subtitle="Ecommerce" />
      <Row>
        <Col xl={3}>
          <SellerContact />
        </Col>
        <Col xl={9}>
          <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1 g-3 align-items-center">
            {sellerStatData.map((item, idx) => <Col key={idx}>
                <SellerStatisticCard item={item} />
              </Col>)}
          </Row>
          <SellerOverview />
          <h4 className="my-4">My Products</h4>
          <Row>
            <Col xs={12}>
              <SellerProducts />
            </Col>
          </Row>
        </Col>
      </Row>
    </>;
};
export default Page;