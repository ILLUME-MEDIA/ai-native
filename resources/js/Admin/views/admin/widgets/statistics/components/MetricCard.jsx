import { CountUp } from '@admin/components/wrappers/CountUp';
import { Icon as IconifyIcon } from '@iconify/react';
import { Card, CardBody, Col } from 'react-bootstrap';
import { metricData } from './data';
const MetricCard = () => {
  return <>
      {metricData.map((item, idx) => <Col key={idx}>
          <Card>
            <CardBody className="d-flex justify-content-between align-items-center">
              <div>
                <h3 className="mb-2 fw-normal">
                  <CountUp start={0} end={item.value} prefix={item.prefix} suffix={item.suffix} />
                </h3>
                <p className="mb-0 text-muted">{item.title}</p>
              </div>
              <div className="avatar fs-60 avatar-img-size">
                <span className={`avatar-title ${item.className} rounded-circle fs-24`}>
                  <IconifyIcon icon={item.icon} />
                </span>
              </div>
            </CardBody>
          </Card>
        </Col>)}
    </>;
};
export default MetricCard;