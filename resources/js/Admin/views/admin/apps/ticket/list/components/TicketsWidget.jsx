import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody } from 'react-bootstrap';
const TicketsWidget = ({
  stat
}) => {
  const {
    change,
    icon,
    title,
    unit,
    value
  } = stat;
  return <Card className="mb-2">
      <CardBody>
        <div className="d-flex gap-3">
          <div className="avatar-lg rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center">
            <Icon icon={icon} className="fs-xxl"></Icon>
          </div>
          <div className="flex-grow-1">
            <div className="mb-2 d-flex justify-content-between align-items-center">
              <h5 className="fs-xl mb-0">
                {value} {unit && <small className="fs-6">{unit}</small>}
              </h5>
              {change && <span className="d-flex justify-content-center align-items-center gap-1">
                  {change > 0 ? '+' : ''}
                  {change}%{change > 0 ? <Icon icon="arrow-up" className="text-success" /> : <Icon icon="arrow-down" className="text-danger" />}
                </span>}
            </div>
            <p className="text-muted mb-0">{title}</p>
          </div>
        </div>
      </CardBody>
    </Card>;
};
export default TicketsWidget;