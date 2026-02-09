import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import CardTable from './components/CardTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Gift Cards" subtitle="Promo" />
      <Row>
        <Col xs="12">
          <CardTable />
        </Col>
      </Row>
    </>;
};
export default Page;