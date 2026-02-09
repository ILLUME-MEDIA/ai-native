import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import Dropzone from './components/Dropzone';
import FilePondUploader from './components/FilePondUploader';
const Page = () => {
  return <>
      <PageBreadcrumb title="File Uploads" subtitle="Forms" />

      <Row>
        <Col xs="12">
          <Dropzone />
          <FilePondUploader />
        </Col>
      </Row>
    </>;
};
export default Page;