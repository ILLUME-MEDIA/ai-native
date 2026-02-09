import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import clsx from 'clsx';
import { Card, CardBody } from 'react-bootstrap';
const OrdersStatCard = ({
  item
}) => {
  return <Card className="mb-1">
      <CardBody>
        <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
          <h3 className="mb-0">
            <CountUp end={item.value} prefix={item.prefix} suffix={item.suffix} />
          </h3>
          <div className="avatar-md flex-shrink-0">
            <span className={clsx('avatar-title  rounded-circle fs-22', item.className)}>
              <Icon icon={item.icon} />
            </span>
          </div>
        </div>
        <p className="mb-0 text-uppercase fs-xs fw-bold">
          {item.title}
          <span className={`float-end badge badge-soft-${item.change > 0 ? 'success' : 'danger'}`}>
            {item.change > 0 ? '+' : ''}
            {item.change}%
          </span>
        </p>
      </CardBody>
    </Card>;
};
export default OrdersStatCard;