import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Card, Col, Row } from 'react-bootstrap';
import { holidayStatData } from './components/data';
import HolidayTable from './components/HolidayTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Holidays" subtitle="HRM" />
      <Row className="row-cols-2 row-cols-md-4 row-cols-xl-6 g-1 mb-1">
        {holidayStatData.map((item, idx) => <Col key={idx}>
            <StatCard {...item} />
          </Col>)}
      </Row>
      <HolidayTable />
    </>;
};
export default Page;
const StatCard = ({
  icon,
  title,
  value
}) => {
  return <>
      <Card className="p-3 mb-0">
        <div className="d-flex align-items-center gap-3">
          <div className="avatar-lg rounded-circle d-flex align-items-center justify-content-center text-bg-light">
            <Icon icon={icon} className="fs-xxl" />
          </div>
          <div className="flex-grow-1">
            <p className="mb-1 text-muted">{title}</p>
            <h4 className="mb-0">{value}</h4>
          </div>
        </div>
      </Card>
    </>;
};