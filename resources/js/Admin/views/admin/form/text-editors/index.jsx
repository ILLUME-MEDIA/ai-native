import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Row } from 'react-bootstrap';
import TextEditors from './components/TextEditors';
const Page = () => {
  return <>
      <PageBreadcrumb title="Text Editors" subtitle="Forms" />

      <Row>
        <TextEditors />
      </Row>
    </>;
};
export default Page;