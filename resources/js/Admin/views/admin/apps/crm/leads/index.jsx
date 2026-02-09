import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { CountUp } from '@admin/components/wrappers/CountUp';
import { Card, Col, Row } from 'react-bootstrap';
import LeadsTable from './components/LeadsTable';
import { leadStatData } from './components/data';
const Page = () => {
  return <>
      <PageBreadcrumb title="Leads" subtitle="CRM" />
      <Row className="row-cols-2 row-cols-md-4 row-cols-xl-6 g-1 mb-1">
        {leadStatData.map((item, idx) => <Col key={idx}>
            <StatCard {...item} />
          </Col>)}
      </Row>
      <Row>
        <Col xs="12">
          <LeadsTable />
        </Col>
      </Row>
    </>;
};
export default Page;
const StatCard = ({
  title,
  value,
  suffix
}) => {
  return <>
      <Card className="text-center p-3 mb-0">
        <p className="mb-1 text-muted">{title}</p>
        <h4 className="mb-0">
          <CountUp start={0} end={value} duration={10} suffix={suffix || ''} />
        </h4>
      </Card>
    </>;
};