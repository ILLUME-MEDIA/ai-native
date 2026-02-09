import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, Col } from 'react-bootstrap';
const Stat = () => {
  return <>
      <Col md="6" xxl="3">
        <Card className="card-h-100">
          <CardBody>
            <div className="d-flex justify-content-between">
              <div>
                <h5 className="text-muted fs-base text-uppercase" title="Total Orders">
                  Total Orders
                </h5>
                <h3 className="my-2 py-1 fw-semibold">
                  <CountUp end={12540} start={0} duration={10} />
                </h3>
                <p className="mb-0 text-muted">
                  <span className="text-success me-2">
                    <Icon icon="arrow-up" /> 3.2%
                  </span>
                  Since last month
                </p>
              </div>
              <div className="avatar-lg flex-shrink-0">
                <span className="avatar-title bg-primary-subtle rounded fs-22">
                  <Icon icon="shopping-cart" className="text-primary" />
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </Col>

      <Col md="6" xxl="3">
        <Card className="bg-info-subtle border-info border-opacity-25 card-h-100">
          <CardBody>
            <div className="d-flex justify-content-between">
              <div>
                <h5 className="text-muted fs-base text-uppercase" title="New Customers">
                  New Customers
                </h5>
                <h3 className="my-2 py-1 fw-semibold">
                  <CountUp end={1284} start={0} duration={10} />
                </h3>
                <p className="mb-0 text-muted">
                  <span className="text-success me-2">
                    <Icon icon="arrow-up" /> 6.1%
                  </span>
                  Since last month
                </p>
              </div>
              <div className="avatar-lg flex-shrink-0">
                <span className="avatar-title text-bg-info rounded-circle fs-22">
                  <Icon icon="users" />
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </Col>

      <Col md="6" xxl="3">
        <Card className="text-bg-primary card-h-100">
          <CardBody>
            <div className="d-flex justify-content-between">
              <div>
                <h5 className="text-white-50 fs-base text-uppercase" title="Total Revenue">
                  Revenue
                </h5>
                <h3 className="my-2 py-1 fw-semibold">
                  <CountUp end={98.4} start={0} duration={10} prefix="$" suffix="k" decimals={2} />
                </h3>
                <p className="mb-0 text-white-50">
                  <span className="text-white me-2">
                    <Icon icon="arrow-down" /> 2.9%
                  </span>
                  Since last month
                </p>
              </div>
              <div className="avatar-lg flex-shrink-0">
                <span className="avatar-title bg-white bg-opacity-25 rounded fs-22">
                  <Icon icon="pig-money" className="text-white" />
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </Col>

      <Col md="6" xxl="3">
        <Card className="card-h-100">
          <CardBody>
            <div className="d-flex justify-content-between">
              <div>
                <h5 className="text-muted fs-base text-uppercase" title="Conversion Rate">
                  Conversion Rate
                </h5>
                <h3 className="my-2 py-1 fw-semibold">
                  <CountUp end={4.76} start={0} duration={1} decimals={2} />%
                </h3>
                <p className="mb-0 text-muted">
                  <span className="text-success me-2">
                    <Icon icon="arrow-up" /> 1.4%
                  </span>
                  Since last month
                </p>
              </div>
              <div className="avatar-lg flex-shrink-0">
                <span className="avatar-title bg-primary-subtle rounded fs-22">
                  <Icon icon="trending-up" className="text-primary" />
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </Col>
    </>;
};
export default Stat;