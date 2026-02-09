import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import AIMetrics from './components/AIMetrics';
import AIStatsCard from './components/AIStatsCard';
import MetricCard from './components/MetricCard';
import OverviewCard from './components/OverviewCard';
import ProjectStat from './components/ProjectStat';
import SalesMetric from './components/SalesMetric';
import Stat from './components/Stat';
import SubscriptionMetric from './components/SubscriptionMetric';
const Page = () => {
  return <>
      <PageBreadcrumb title="Statistics" subtitle="Widgets" />

      <Row>
        <Stat />
      </Row>

      <Row>
        <Col xs="12">
          <ProjectStat />
        </Col>
      </Row>

      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1 g-3 align-items-center">
        <OverviewCard />
      </Row>

      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1 g-3 align-items-center">
        <MetricCard />
      </Row>

      <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 g-2">
        <SalesMetric />
      </Row>

      <Row>
        <AIMetrics />
      </Row>

      <Row className="row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-xl-4 row-cols-xxl-6">
        <AIStatsCard />
      </Row>

      <div className="row row-cols-xxl-4 row-cols-md-2 row-cols-1">
        <SubscriptionMetric />
      </div>
    </>;
};
export default Page;