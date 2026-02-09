import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import DiscountTable from './components/DiscountTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Discounts" subtitle="Promo" />
      <Row>
        <Col xs="12">
          <DiscountTable />
        </Col>
      </Row>
    </>;
};
export default Page;