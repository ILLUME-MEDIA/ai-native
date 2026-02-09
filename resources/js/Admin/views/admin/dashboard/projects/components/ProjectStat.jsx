import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap';
import { projectStatData } from './data';
import { useCallback, useEffect, useState } from 'react';
const ProjectStat = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const formatTime = useCallback(seconds => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = seconds % 60;
    return [hours, minutes, secs].map(v => v < 10 ? `0${v}` : v).join(':');
  }, []);
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => {
          return startTime ? Math.floor((Date.now() - startTime) / 1000) : prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);
  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      setStartTime(Date.now() - elapsedTime * 1000);
      setIsRunning(true);
    }
  };
  return <>
      <Card>
        <CardBody className="p-0">
          <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 g-0 text-center align-items-center">
            {projectStatData.map((item, idx) => <Col className="border-end border-light border-dashed" key={idx}>
                <div className="mt-3 mt-md-0 p-3">
                  <h5 className="text-muted fs-13 text-uppercase" title="Number of Orders">
                    {item.title}
                  </h5>
                  <div className="d-flex align-items-center justify-content-center gap-2 my-3">
                    <div className="avatar-sm flex-shrink-0">
                      <span className={`avatar-title ${item.className} rounded-circle fs-22`}>
                        <Icon icon={item.icon} />
                      </span>
                    </div>
                    <h3 className="mb-0 fw-bold">
                      <CountUp end={item.value} start={0} duration={5} prefix={item.prefix} suffix={item.suffix} decimal="." decimals={2} />
                    </h3>
                  </div>
                  <p className="mb-0 text-muted">
                    <span className={`me-2 ${item.change >= 0 ? 'text-success' : 'text-danger'}`}>
                      {item.change >= 0 ? <Icon icon="chevron-up" /> : <Icon icon="chevron-down" />}
                      {item.change}%
                    </span>
                    <span className="text-nowrap">Since last month</span>
                  </p>
                </div>
              </Col>)}

            <Col>
              <div className="mt-3 mt-md-0 p-3">
                <h5 className="text-muted fs-13 text-uppercase" title="Number of Orders">
                  Today's Hours
                </h5>
                <div className="d-flex align-items-center justify-content-center gap-2 my-3">
                  <div className="avatar-sm flex-shrink-0">
                    <span className="avatar-title bg-info-subtle text-info rounded-circle fs-22">
                      <Icon icon="clock" />
                    </span>
                  </div>
                  <h3 className="mb-0 fw-bold">
                    <span id="tracker-time">{formatTime(elapsedTime)}</span>
                  </h3>
                </div>
                <Button size="sm" onClick={toggleTimer} variant="info" type="button" className="time-tracker-btn fw-semibold w-100">
                  {isRunning ? 'Stop Tracker' : 'Start Tracker'}
                </Button>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </>;
};
export default ProjectStat;