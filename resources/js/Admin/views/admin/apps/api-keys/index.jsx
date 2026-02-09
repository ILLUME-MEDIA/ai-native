import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import ApiKeyTable from './components/ApiKeyTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="API Keys" subtitle="Apps" />
      <Row>
        <Col xs={12}>
          <ApiKeyTable />
        </Col>
      </Row>
    </>;
};
export default Page;