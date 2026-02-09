import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Row } from 'react-bootstrap';
import Table from './components/Table';
const Page = () => {
  return <>
      <PageBreadcrumb title="Select" subtitle="DataTables" />
      <Row className="justify-content-center">
        <Table />
      </Row>
    </>;
};
export default Page;