import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Row } from 'react-bootstrap';
import ExamplesCard from './components/VectorMaps';
const Page = () => {
  return <>
      <PageBreadcrumb title="Vector Maps" subtitle="Maps" />

      <Row>
        <ExamplesCard />
      </Row>
    </>;
};
export default Page;