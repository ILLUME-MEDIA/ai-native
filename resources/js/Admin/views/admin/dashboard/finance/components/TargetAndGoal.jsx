import { CountUp } from '@admin/components/wrappers/CountUp';
import { Icon as IconifyIcon } from '@iconify/react';
import { Link } from 'react-router';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { targetData } from './data';
const TargetAndGoal = () => {
  return <>
      <div className="d-flex align-items-center mb-3 mt-2">
        <h4 className="fw-bold fs-md">My Targets &amp; Goals</h4>
        <Link to="" className="text-decoration-underline fw-semibold fs-15 ms-auto link-offset-2 link-dark">
          See All
        </Link>
      </div>

      <Row className="row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xxl-5">
        {targetData.map((item, idx) => <Col key={idx}>
            <Card className="border-0 rounded-3 text-white" style={{
          backgroundImage: `url(${item.image})`,
          backgroundSize: 'cover'
        }}>
              <CardBody className={`bg-gradient ${item.className} bg-opacity-90 rounded-3`}>
                <IconifyIcon icon={item.icon} className="fs-36" />
                <p className="text-white text-opacity-75 mb-1 text-uppercase">Goal</p>
                <h3 className="fw-semibold mb-2 fs-20 text-white">{item.title}</h3>
                <h4 className="fw-medium fs-16 mb-1 text-white">
                  $<CountUp start={0} end={item.amount} duration={10} separator="," />
                </h4>
              </CardBody>
            </Card>
          </Col>)}
      </Row>
    </>;
};
export default TargetAndGoal;