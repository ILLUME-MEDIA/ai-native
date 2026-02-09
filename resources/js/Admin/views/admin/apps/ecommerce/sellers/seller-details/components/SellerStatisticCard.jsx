import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import clsx from 'clsx';
import { Card, CardBody } from 'react-bootstrap';
const SellerStatisticCard = ({
  item
}) => {
  const {
    value,
    prefix,
    suffix,
    totalCount,
    subTitle,
    bulletClassName,
    iconClassName,
    title,
    icon
  } = item;
  return <Card>
      <CardBody>
        <div className="d-flex justify-content-between">
          <h5 title="Number of Tasks">{title}</h5>
          <p className="mb-0 fs-lg">
            <Icon icon="info-hexagon-filled" className="text-muted" />
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 my-2">
          <div className="avatar-md flex-shrink-0">
            <span className={clsx('avatar-title  bg-opacity-90 rounded-circle fs-22 d-flex align-items-center justify-content-center', iconClassName)}>{icon && <Icon icon={icon} className="d-flex align-items-center" />}</span>
          </div>
          <h3 className="mb-0">
            <CountUp prefix={prefix} suffix={suffix} end={value} duration={1} enableScrollSpy scrollSpyOnce />
          </h3>
        </div>
        <p className="d-flex align-items-center gap-1 mb-0">
          <Icon icon="circle-filled" className={bulletClassName} />
          <span className="text-nowrap text-muted"> {subTitle}</span>
          <span className="ms-auto">
            <b>{totalCount}</b>
          </span>
        </p>
      </CardBody>
    </Card>;
};
export default SellerStatisticCard;