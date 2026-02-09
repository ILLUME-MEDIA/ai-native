import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import Channel from './components/Channel';
import Chat from './components/Chat';
import Search from './components/Search';
import Stat from './components/Stat';
import SummaryAlt from './components/SummaryAlt';
import TeamMember from './components/TeamMember';
import TopCountries from './components/TopCountries';
import TopTrafficSources from './components/TopTrafficSources ';
import TotalSubscribers from './components/TotalSubscribers';
import TotalVisitors from './components/TotalVisitors';
import TrafficSources from './components/TrafficSources';
const Page = () => {
  return <>
      <PageBreadcrumb title="Mixed Widgets" subtitle="Widgets" />
      <Row className="row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xxl-5">
        <Stat />
      </Row>

      <Row>
        <Col xxl="4" xl="6">
          <TotalVisitors />
        </Col>
        <Col xxl="4" xl="6">
          <TotalSubscribers />
        </Col>
        <Col xxl="4">
          <TopTrafficSources />
        </Col>
      </Row>
      <Row>
        <SummaryAlt />
      </Row>

      <Row>
        <TeamMember />
      </Row>

      <Row>
        <Col xl="4">
          <Chat />
        </Col>
        <Col xxl="4" lg="6">
          <TrafficSources />
        </Col>
        <Col xxl="4" lg="6">
          <TopCountries />
        </Col>
      </Row>

      <Row>
        <Col xxl="7">
          <Channel />
        </Col>
        <Col xxl="5">
          <Search />
        </Col>
      </Row>
    </>;
};
export default Page;