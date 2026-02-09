import { Icon as IconifyIcon } from '@iconify/react';
import { Card, CardBody, Col } from 'react-bootstrap';
import { progressData } from './data';
const OverviewCard = () => {
  return <>
      {progressData.map((item, idx) => <Col key={idx}>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-start">
                <div className="avatar avatar-lg flex-shrink-0">
                  <span className={`avatar-title border border-3 border-${item.variant} bg-${item.variant} bg-opacity-75 text-white rounded-circle fs-24`}>
                    <IconifyIcon icon={item.icon} />
                  </span>
                </div>
                <div className="text-end">
                  <h4 className="mb-0">{item.value}</h4>
                  <p className="mb-0 text-muted">{item.title}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted fs-xs fw-semibold">{item.progress.label}</span>
                  <span className="text-muted">{item.progress.value}%</span>
                </div>
                <div className="progress" style={{
              height: 6
            }}>
                  <div className={`progress-bar bg-${item.variant}`} style={{
                width: `${item.progress.value}%`
              }} />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>)}
    </>;
};
export default OverviewCard;