import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import FormCropper from './components/FormCropper';
const Page = () => {
  return <>
      <PageBreadcrumb title="Image Cropper" subtitle="Forms" />
      <Row>
        <Col xs="12">
          <FormCropper />
        </Col>
      </Row>
    </>;
};
export default Page;