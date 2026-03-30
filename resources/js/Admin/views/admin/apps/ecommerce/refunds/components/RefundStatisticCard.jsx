import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody } from 'react-bootstrap';

const RefundStatisticCard = ({ item }) => {
  const { icon, badgeClassName, iconClassName, title, change, value } = item;

  return (
    <Card className="mb-1">
      <CardBody>
        <div className="d-flex align-items-center gap-3 mb-3">
          {/* Colored circle icon — explicit size so it always matches design */}
          <div
            className={`flex-shrink-0 rounded-circle d-flex align-items-center justify-content-center ${iconClassName}`}
            style={{ width: 52, height: 52, fontSize: 22 }}
          >
            <Icon icon={icon} />
          </div>
          {/* Big number */}
          <h3 className="mb-0 fw-bold" style={{ fontSize: '1.75rem', lineHeight: 1 }}>
            {value ?? 0}
          </h3>
        </div>
        <p className="mb-0 d-flex align-items-center justify-content-between">
          <span>{title}</span>
          {change != null && (
            <span className={`badge ${badgeClassName}`} style={{ fontSize: '0.72rem' }}>
              {change > 0 ? '+' : ''}{change}%
            </span>
          )}
        </p>
      </CardBody>
    </Card>
  );
};

export default RefundStatisticCard;
