import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { statData } from './data';
const AIMetrics = () => {
  return <>
      {statData.map((item, idx) => <Col md="6" xxl="3" key={idx}>
          <Card className="card-h-100">
            <CardBody>
              <Row className="align-items-center">
                <Col xs="6">
                  <h5 className="text-muted fs-sm text-uppercase text-truncate" title="AI Model Requests">
                    {item.title}
                  </h5>
                  <div className="d-flex align-items-center gap-2 my-3">
                    <div className="avatar-md flex-shrink-0">
                      <span className="avatar-title text-bg-light rounded-circle fs-22">
                        <Icon icon={item.icon} />
                      </span>
                    </div>
                    <h3 className="mb-0 fw-bold">
                      <CountUp start={0} end={item.value} duration={2} prefix={item.prefix} suffix={item.suffix} />
                    </h3>
                  </div>
                  <p className="mb-0 text-muted">
                    <span className={`me-2 ${item.change >= 0 ? 'text-success' : 'text-danger'}`}>
                      {item.change}% {item.change >= 0 ? <Icon icon="trending-up" /> : <Icon icon="trending-down" />}
                    </span>
                    <span className="text-nowrap">{item.changeText}</span>
                  </p>
                </Col>
                <Col xs="6" className="text-end">
                  <p className="text-muted mb-0">{item.target.label}</p>
                  <h5 className="my-2 fw-semibold">{item.target.value}</h5>
                  <span className={`badge ${item.badge.className}`}>
                    {item.badge.label} <Icon icon={item.badge.icon} className="ms-1" />
                  </span>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>)}
    </>;
};
export default AIMetrics;