import { Icon as IconifyIcon } from '@iconify/react';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { weatherData } from './data';
const SummaryCard = () => {
  return <>
      {weatherData.map((item, idx) => <Col xl="6" key={idx}>
          <Card className={`${item.className} border-0`}>
            <CardBody>
              <Row className="align-items-center">
                <Col md="4">
                  <div className="d-flex justify-content-center align-items-center gap-3">
                    <div>
                      <IconifyIcon icon={item.current.icon} className="fs-48" />
                      <h2 className="mt-1 mb-0">{item.current.temperature}</h2>
                    </div>
                    <div>
                      <p className="mb-0">{item.current.status}</p>
                      <small>
                        {item.current.wind} - {item.current.humidity}
                      </small>
                    </div>
                  </div>
                </Col>

                <Col md="8" className="mt-4 mt-md-0 text-center">
                  <Row>
                    {item.forecast.map((day, dayIdx) => <Col key={dayIdx}>
                        <h6 className="text-white-50 mb-1">{day.day}</h6>
                        <IconifyIcon icon={day.icon} className="fs-32" />
                        <p className="mt-1 mb-0">{day.temperature}</p>
                      </Col>)}
                  </Row>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>)}
    </>;
};
export default SummaryCard;