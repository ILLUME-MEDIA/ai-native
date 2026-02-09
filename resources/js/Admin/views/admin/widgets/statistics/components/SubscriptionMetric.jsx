import { CountUp } from '@admin/components/wrappers/CountUp';
import { Icon as IconifyIcon } from '@iconify/react';
import { Card, CardBody, CardHeader, CardTitle, Col } from 'react-bootstrap';
import { businessStatData } from './data';
const SubscriptionMetric = () => {
  return <>
      {businessStatData.map((item, idx) => <Col key={idx}>
          <Card>
            <CardHeader className="justify-content-between border-0">
              <CardTitle as="h5">{item.title}</CardTitle>
              <span className={`badge ${item.badge.className}`}>{item.badge.label}</span>
            </CardHeader>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div className="avatar fs-60 avatar-img-size flex-shrink-0">
                  <span className={`avatar-title ${item.className} rounded-circle fs-24`}>
                    <IconifyIcon icon={item.icon} />
                  </span>
                </div>
                <div className="text-end">
                  <h3 className="mb-2 fw-normal">
                    <CountUp start={0} duration={10} end={item.value} prefix={item.prefix} suffix={item.suffix} />
                  </h3>
                  <p className="mb-0 text-muted">{item.description}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>)}
    </>;
};
export default SubscriptionMetric;