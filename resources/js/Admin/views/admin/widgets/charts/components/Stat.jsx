import ApexChart from '@admin/components/wrappers/ApexChart';
import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { statData } from './data';
const Stat = () => {
  return <>
      {statData.map((item, idx) => {
      const options = item.chartOptions();
      return <Col md="6" xxl="3" key={idx}>
            <Card className="card-h-100">
              <CardBody>
                <Row className="align-items-center">
                  <Col xs="6">
                    <h5 className="text-muted fs-sm text-uppercase text-truncate" title="Leads Generated">
                      {item.title}
                    </h5>
                    <div className="d-flex align-items-center gap-2 my-3">
                      <div className="avatar-md flex-shrink-0">
                        <span className="avatar-title text-bg-light rounded-circle fs-22">
                          <Icon icon={item.icon} />
                        </span>
                      </div>
                      <h3 className="mb-0 fw-bold">
                        <CountUp end={item.value} start={0} duration={10} prefix="$" suffix="k" decimals={2} decimal="." />
                      </h3>
                    </div>
                    <p className="mb-0 text-muted">
                      <span className={`me-2 ${item.change >= 0 ? "text-success" : "text-danger"}`}>
                        {item.change >= 0 ? "" : ""}
                        {item.change}%{" "}
                        <Icon icon={item.change >= 0 ? "trending-up" : "trending-down"} className="ms-1" />
                      </span>
                      &nbsp;
                      <span className="text-nowrap">{item.label}</span>
                    </p>
                  </Col>
                  <Col xs="6">
                    <div className="text-end">
                      <ApexChart getOptions={() => options} series={item.chartOptions().series} type={item.chartOptions().chart?.type} height={item.chartOptions().chart?.height} width={item.chartOptions().chart?.width} />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>;
    })}
    </>;
};
export default Stat;