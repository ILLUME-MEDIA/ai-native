import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Row } from 'react-bootstrap';
import LeaFletMap from './components/LeaFletMap';
export const dynamic = 'force-dynamic';
const Page = () => {
  return <>
      <PageBreadcrumb title="Leaflet Maps" subtitle="Maps" />
      <Row>
        <LeaFletMap />
      </Row>
    </>;
};
export default Page;