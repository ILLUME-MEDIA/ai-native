import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import CouponTable from './components/CouponTable';
import { couponStatData } from './components/data';
const Page = () => {
  return <>
      <PageBreadcrumb title="Coupons" subtitle="Promo" />
      <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 align-items-center g-1">
        {couponStatData.map((item, index) => <Col key={index}>
            <StatCard {...item} />
          </Col>)}
      </Row>
      <Row>
        <Col xs="12">
          <CouponTable />
        </Col>
      </Row>
    </>;
};
export default Page;
const StatCard = ({
  title,
  value,
  change,
  icon,
  iconClassName,
  badgeClassName
}) => {
  return <>
      <Card className="mb-1">
        <CardBody>
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="avatar-md flex-shrink-0">
              <span className={`avatar-title ${iconClassName} rounded-circle fs-22`}>
                <Icon icon={icon} />
              </span>
            </div>
            <h3 className="mb-0">{value}</h3>
          </div>
          <p className="mb-0">
            {title}
            <span className={`float-end badge ${badgeClassName}`}>{change}%</span>
          </p>
        </CardBody>
      </Card>
    </>;
};