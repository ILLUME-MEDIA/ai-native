import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Row } from 'react-bootstrap';
import GoogleMap from './components/GoogleMap';
const Page = () => {
  return <>
      <PageBreadcrumb title="Google" subtitle="Maps" />
      <Row>
        <GoogleMap />
      </Row>
    </>;
};
export default Page;