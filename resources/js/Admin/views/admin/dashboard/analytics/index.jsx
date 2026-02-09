import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import AnalyticsOverview from './components/AnalyticsOverview';
import AudienceInsight from './components/AudienceInsight';
import SessionByBrowser from './components/SessionByBrowser';
import SessionOverview from './components/SessionOverview';
import TopTraffic from './components/TopTraffic';
import TotalOrder from './components/TotalOrder';
import TotalSubscriber from './components/TotalSubscriber';
import TotalVisitors from './components/TotalVisitors';
import UserGeography from './components/UserGeography';
const Page = () => {
  return <>
      <PageBreadcrumb title="Analytics" subtitle="Dashboard" />

      <Row>
        <Col xxl="4" xl="6">
          <TotalOrder />
        </Col>
        <Col xxl="4" xl="6">
          <TotalVisitors />
        </Col>
        <Col xxl="4" xl="12">
          <TotalSubscriber />
        </Col>
      </Row>

      <Row>
        <Col xxl="9" xl="8">
          <SessionOverview />
        </Col>
        <Col xxl="3" xl="4">
          <AudienceInsight />
        </Col>
      </Row>

      <Row>
        <Col xl="7">
          <UserGeography />
        </Col>
        <Col xl="5">
          <TopTraffic />
        </Col>
      </Row>

      <Row>
        <Col xl="3">
          <SessionByBrowser />
        </Col>
        <AnalyticsOverview />
      </Row>
    </>;
};
export default Page;