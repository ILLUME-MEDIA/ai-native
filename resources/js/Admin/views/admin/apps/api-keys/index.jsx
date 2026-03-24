import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import AppSecretsTable from './components/AppSecretsTable';

const Page = () => {
  return (
    <>
      <PageBreadcrumb title="App Secrets" subtitle="Apps" />
      <Row>
        <Col xs={12}>
          <AppSecretsTable />
        </Col>
      </Row>
    </>
  );
};

export default Page;
