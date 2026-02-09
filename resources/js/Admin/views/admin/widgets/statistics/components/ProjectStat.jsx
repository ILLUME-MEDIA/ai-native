import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { summaryData } from './data';
const ProjectStat = () => {
  return <>
      <Card>
        <CardBody className="p-0">
          <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 g-0 text-center align-items-center">
            {summaryData.map((item, idx) => <Col className={`${idx < summaryData.length - 1 ? 'border-end border-light border-dashed' : ''}`} key={idx}>
                <div className="mt-3 mt-md-0 p-3">
                  <h5 className="text-muted fs-13 text-uppercase" title="Number of Orders">
                    {item.title}
                  </h5>
                  <div className="d-flex align-items-center justify-content-center gap-2 my-3">
                    <div className="avatar-sm flex-shrink-0">
                      <span className={`avatar-title rounded-circle fs-22 ${item.className}`}>
                        <Icon icon={item.icon} />
                      </span>
                    </div>
                    <h3 className="mb-0 fw-bold">
                      <CountUp start={0} end={item.value} duration={10} suffix={item.suffix} prefix={item.prefix} />
                    </h3>
                  </div>
                  <p className="mb-0 text-muted">
                    <span className={`me-2 ${item.change >= 0 ? 'text-success' : 'text-danger'}`}>
                      {item.change >= 0 ? <Icon icon="chevron-up" /> : <Icon icon="chevron-down" />}
                      {Math.abs(item.change)}%
                    </span>
                    <span className="text-nowrap">Since last month</span>
                  </p>
                </div>
              </Col>)}
          </Row>
        </CardBody>
      </Card>
    </>;
};
export default ProjectStat;