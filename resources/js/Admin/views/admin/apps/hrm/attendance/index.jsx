import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import AttendanceTable from './components/AttendanceTable';
import { attendanceStatData } from './components/data';
const Page = () => {
  return <>
      <PageBreadcrumb title="Attendance" subtitle="HRM" />
      <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 g-2">
        {attendanceStatData.map((item, idx) => <Col key={idx}>
            <StatCard {...item} />
          </Col>)}
      </Row>
      <Row>
        <Col xs="12">
          <AttendanceTable />
        </Col>
      </Row>
    </>;
};
export default Page;
const StatCard = ({
  title,
  value,
  icon,
  change,
  unit
}) => {
  return <>
      <Card className="mb-2">
        <CardBody>
          <div className="d-flex gap-3">
            <div className="avatar-lg rounded-circle bg-light d-flex align-items-center justify-content-center">
              <Icon icon={icon} className="fs-xxl" />
            </div>
            <div className="flex-grow-1">
              <div className="mb-2 d-flex justify-content-between align-items-center">
                <h5 className="fs-xl mb-0">
                  {value}&nbsp;
                  <small className="fs-6">{unit}</small>
                </h5>
                <span>
                  {change}%{change && change > 0 ? <Icon icon="arrow-up" className="text-success" /> : <Icon icon="arrow-down" className="text-danger" />}
                </span>
              </div>
              <p className="text-muted mb-0">{title}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </>;
};