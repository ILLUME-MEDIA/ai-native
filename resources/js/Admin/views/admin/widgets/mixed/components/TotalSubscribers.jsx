import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, ProgressBar } from 'react-bootstrap';
import { subscriberData } from './data';
const TotalSubscribers = () => {
  return <>
      <Card className="card-h-100">
        <CardBody>
          <div className="d-flex justify-content-between align-items-start flex-wrap">
            <div>
              <h4 className="fs-13 mb-2 fw-bold text-uppercase text-muted">Total Subscribers</h4>
              <div className="d-flex align-items-center gap-2 mb-2 py-1">
                <div className="avatar-md flex-shrink-0">
                  <span className="avatar-title text-bg-info rounded-circle">
                    <Icon icon="mail" className="fs-xxl" />
                  </span>
                </div>
                <h3 className="mb-0">
                  <CountUp start={0} end={55.6} duration={10} decimals={2} suffix="k" />
                </h3>
                <span className="badge fs-13 ms-auto badge-soft-success">
                  <Icon icon="arrow-up" /> 4.87%
                </span>
              </div>
            </div>
            <div className="app-search app-search-sm">
              <select className="form-select form-control form-select-sm">
                <option value="All">All Time</option>
                <option value="today">Today</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_90_days">Last 90 Days</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
              </select>
              <Icon icon="calendar" className="app-search-icon text-muted" />
            </div>
          </div>
          {subscriberData.map((item, idx) => <div className="mt-2 pt-1" key={idx}>
              <div className="d-flex justify-content-between">
                <h5 className="fs-base mb-2">{item.title}</h5>
                <div>
                  <span>
                    <CountUp end={item.value} start={0} duration={10} separator="," prefix="+" />
                  </span>
                  <span>
                    <Icon icon="circle-filled" className="text-light mx-3 fs-10" /> {item.progress}%
                  </span>
                </div>
              </div>
              <div className="progress progress-sm mb-1">
                <ProgressBar className={`bg-${item.variant}`} role="progressbar" style={{
              width: `${item.progress}%`,
              height: '5px'
            }} aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100} />
              </div>
            </div>)}

          <div className="p-2 mt-3 border-dashed border rounded">
            <div className="d-flex align-items-center">
              <div className="avatar-xl flex-shrink-0 me-2">
                <span className="avatar-title bg-warning-subtle rounded-circle fs-1">
                  <Icon icon="medal" className="text-warning" />
                </span>
              </div>
              <div className="flex-gow-1">
                <h5 className="mb-0 fw-semibold">Congratulations !...</h5>
                <p className="mb-0 text-muted">You've reached a new subscriber milestone.</p>
              </div>
              <div className="ms-auto">
                <h4 className="fs-16 mt-1 mb-0">29.4k</h4>
                <span className="text-muted fw-semibold fs-12">SUBSCRIBERS</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </>;
};
export default TotalSubscribers;