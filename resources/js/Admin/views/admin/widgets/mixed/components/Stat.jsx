import { CountUp } from '@admin/components/wrappers/CountUp';
import { Icon as IconifyIcon } from '@iconify/react';
import { Card, CardBody, Col } from 'react-bootstrap';
import { targetData } from './data';
const Stat = () => {
  return <>
      {targetData.map((item, idx) => <Col key={idx}>
          <Card className="border-0 rounded-3 text-white" style={{
        backgroundImage: `url(${item.image})`,
        backgroundSize: 'cover'
      }}>
            <CardBody className={`bg-gradient ${item.className} bg-opacity-90 rounded-3`}>
              <IconifyIcon icon={item.icon} className="fs-36" />
              <p className="text-white text-opacity-75 mb-1 text-uppercase">{item.label}</p>
              <h3 className="fw-semibold mb-2 fs-20">{item.title}</h3>
              <h4 className="fw-medium fs-16 mb-1">
                <CountUp start={0} end={item.value} prefix={item.prefix} duration={10} separator="," />
              </h4>
            </CardBody>
          </Card>
        </Col>)}
    </>;
};
export default Stat;