import { CountUp } from '@admin/components/wrappers/CountUp';
import { Icon as IconifyIcon } from '@iconify/react';
import { Card, CardBody, Col } from 'react-bootstrap';
import { miniStatData } from './data';
const AIStatsCard = () => {
  return <>
      {miniStatData.map((item, idx) => <Col key={idx}>
          <Card>
            <CardBody className="text-center">
              <IconifyIcon icon={item.icon} className={`fs-36 ${item.className}`} />
              <h3 className="fw-bold mt-3 mb-1">
                <CountUp start={0} end={item.value} prefix={item.prefix} suffix={item.suffix} />
              </h3>
              <p className="text-muted">{item.title}</p>
              <span className={`badge fs-12 ${item.change >= 0 ? 'badge-soft-success' : 'badge-soft-danger'}`}>
                {item.change >= 0 ? <IconifyIcon icon="tabler:arrow-badge-up" /> : <IconifyIcon icon="tabler:arrow-badge-down" />}
                {item.change}%
              </span>
            </CardBody>
          </Card>
        </Col>)}
    </>;
};
export default AIStatsCard;