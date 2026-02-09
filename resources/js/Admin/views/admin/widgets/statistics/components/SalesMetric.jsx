import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, Col } from 'react-bootstrap';
import { dealStatData } from './data';
const SalesMetric = () => {
  return <>
      {dealStatData.map((item, idx) => <Col key={idx} className={idx === dealStatData.length - 1 ? 'col-lg col-md-auto' : ''}>
          <Card>
            <CardBody>
              <div className="d-flex gap-3">
                <div className="avatar-lg rounded-circle text-bg-light d-flex align-items-center justify-content-center">
                  <Icon icon={item.icon} className="fs-xxl" />
                </div>
                <div className="flex-grow-1">
                  <div className="mb-3 d-flex justify-content-between align-items-center">
                    <h5 className="fs-xl mb-0">{item.prefix}{item.value}{item.suffix} </h5>
                    <span>
                      {item.change}%
                      <Icon icon={item.change >= 0 ? "arrow-up" : "arrow-down"} className={item.change >= 0 ? "text-success" : "text-danger"} />
                    </span>
                  </div>
                  <p className="text-muted mb-2">{item.title}</p>
                  <div className={`progress progress-sm bg-${item.variant} bg-opacity-25 mb-0`}>
                    <div className={`progress-bar bg-${item.variant}`} role="progressbar" style={{
                  width: `${item.progress}%`
                }} aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100} />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>)}
    </>;
};
export default SalesMetric;