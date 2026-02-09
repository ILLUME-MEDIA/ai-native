import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import FinancialOverview from './components/FinancialOverview';
import ProjectPerformance from './components/ProjectPerformance';
import ProjectStatus from './components/ProjectStatus';
import RevenueStat from './components/RevenueStat';
import SalesReport from './components/SalesReport';
import Stat from './components/Stat';
import StorePerformance from './components/StorePerformance';
const Page = () => {
  return <>
      <PageBreadcrumb title="Charts" subtitle="Widgets" />
      <Row>
        <Stat />
      </Row>
      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1">
        <RevenueStat />
      </Row>
      <Row>
        <Col xxl="3" xl="6">
          <ProjectStatus />
        </Col>
        <Col xxl="3" xl="6" className="order-xxl-1">
          <StorePerformance />
        </Col>
        <Col xxl="6" xl="12">
          <ProjectPerformance />
        </Col>
      </Row>

      <Row>
        <Col xxl="6">
          <SalesReport />
        </Col>
        <Col xxl="6">
          <FinancialOverview />
        </Col>
      </Row>
    </>;
};
export default Page;