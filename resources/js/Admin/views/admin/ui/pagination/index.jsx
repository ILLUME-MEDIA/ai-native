import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import { AlignmentPagination, BoxedPagination, CustomColorPagination, CustomIconPagination, DefaultPagination, DisabledAndActive, RoundedPagination, SizingPagination, SoftPagination } from './components/Paginations';
const Page = () => {
  return <>
      <PageBreadcrumb title="Pagination" subtitle="UI" />
      <Row>
        <Col xl={6}>
          <DefaultPagination />
          <AlignmentPagination />
          <CustomColorPagination />
          <DisabledAndActive />
          <CustomIconPagination />
        </Col>
        <Col xl={6}>
          <SizingPagination />
          <BoxedPagination />
          <RoundedPagination />
          <SoftPagination />
        </Col>
      </Row>
    </>;
};
export default Page;