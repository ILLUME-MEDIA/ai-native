import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import DealStatus from './components/DealStatus';
import LeadSource from './components/LeadSource';
import LocationBySession from './components/LocationBySession';
import Overview from './components/Overview';
import RecentActivity from './components/RecentActivity';
import Stat from './components/Stat';
import TopPerforming from './components/TopPerforming';
const Page = () => {
  return <>
      <PageBreadcrumb title="CRM" subtitle="Dashboard" />

      <Row>
        <Stat />
      </Row>

      <Row>
        <Col xl="8">
          <Overview />
        </Col>
        <Col xl="4">
          <LeadSource />
        </Col>
      </Row>

      <Row>
        <Col xl="12">
          <DealStatus />
        </Col>
      </Row>

      <Row>
        <Col xl="4" lg="12">
          <TopPerforming />
        </Col>
        <Col xl="4" lg="12">
          <LocationBySession />
        </Col>
        <Col xl="4" lg="12">
          <RecentActivity />
        </Col>
      </Row>
    </>;
};
export default Page;