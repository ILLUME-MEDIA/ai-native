import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import ColorPicker from './components/ColorPicker';
import DataPicker from './components/DataPicker';
import Flatpickr from './components/Pickers';
const Page = () => {
  return <>
      <PageBreadcrumb title="Pickers" subtitle="Forms" />

      <Row>
        <Col lg={12}>
          <Flatpickr />
          <DataPicker />
          <ColorPicker />
        </Col>
      </Row>
    </>;
};
export default Page;