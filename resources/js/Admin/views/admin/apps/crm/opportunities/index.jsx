import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import OpportunitiesTable from './components/opportunitiesTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Opportunities" subtitle="CRM" />

      <Row>
        <Col xs="12">
          <OpportunitiesTable />
        </Col>
      </Row>
    </>;
};
export default Page;