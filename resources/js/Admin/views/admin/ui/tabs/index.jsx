import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import { BorderedTabswithColoredBorder, CardWithTabs, DefaultTabs, IconsTabs, TabsBordered, TabsJustified, TabsVerticalLeft, TabsVerticalRight } from './components/Tabs';
const Page = () => {
  return <>
      <PageBreadcrumb title="Tabs" subtitle="UI" />
      <Row>
        <Col xxl={6}>
          <DefaultTabs />
        </Col>
        <Col xxl={6}>
          <TabsJustified />
        </Col>
        <Col xxl={6}>
          <TabsVerticalLeft />
        </Col>
        <Col xxl={6}>
          <TabsVerticalRight />
        </Col>
        <Col xxl={6}>
          <TabsBordered />
        </Col>
        <Col xxl={6}>
          <BorderedTabswithColoredBorder />
        </Col>
        <Col xxl={6}>
          <IconsTabs />
        </Col>
        <Col xxl={6}>
          <CardWithTabs />
        </Col>
      </Row>
    </>;
};
export default Page;