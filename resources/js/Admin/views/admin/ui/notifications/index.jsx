import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Row } from 'react-bootstrap';
import Toast from './components/Toast';
const Page = () => {
  return <>
      <PageBreadcrumb title="Notifications" subtitle="UI" />
      <Row>
        <Toast />
      </Row>
    </>;
};
export default Page;