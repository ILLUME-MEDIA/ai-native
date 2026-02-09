import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Col, Row } from 'react-bootstrap';
import OngoingProject from './components/OngoingProject';
import ProjectPerformance from './components/ProjectPerformance';
import ProjectStat from './components/ProjectStat';
import ProjectStatus from './components/ProjectStatus';
import Task from './components/Task';
import TodaySchedule from './components/TodaySchedule';
const Page = () => {
  return <>
      <PageBreadcrumb title="Project" subtitle="Dashboard" />
      <Row>
        <Col xxl="9">
          <ProjectStat />
          <Row>
            <Col xl="4">
              <ProjectStatus />
            </Col>
            <Col xl="8">
              <ProjectPerformance />
            </Col>
          </Row>
        </Col>
        <Col xxl="3">
          <TodaySchedule />
        </Col>
      </Row>

      <Row>
        <Col xxl="6">
          <OngoingProject />
        </Col>
        <Col xxl="6">
          <Task />
        </Col>
      </Row>
    </>;
};
export default Page;