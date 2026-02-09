import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { incomeStatData } from './components/data';
import IncomeTable from './components/IncomeTable';
const Page = () => {
  return <>
      <PageBreadcrumb title="Income" subtitle="Finance" />
      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1">
        {incomeStatData.map((item, idx) => <Col key={idx}>
            <StatCard {...item} />
          </Col>)}
      </Row>
      <Row>
        <Col xs="12">
          <IncomeTable />
        </Col>
      </Row>
    </>;
};
export default Page;
const StatCard = ({
  prefix,
  value,
  icon,
  className,
  title
}) => {
  return <>
      <Card>
        <CardBody>
          <div className="d-flex justify-content-between align-items-center">
            <div className="avatar fs-60 avatar-img-size flex-shrink-0">
              <span className={`avatar-title ${className} rounded-circle fs-24`}>
                <Icon icon={icon} />
              </span>
            </div>
            <div className="text-end">
              <h3 className="mb-2 fw-normal">
                <CountUp start={0} end={value} duration={3} separator="," prefix={prefix} />
              </h3>
              <p className="mb-0 text-muted">
                <span>{title}</span>
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </>;
};