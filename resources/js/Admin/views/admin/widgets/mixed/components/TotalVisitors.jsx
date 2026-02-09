import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, Table } from 'react-bootstrap';
import { visitorData } from './data';
const TotalVisitors = () => {
  return <>
      <Card className="card-h-100">
        <CardBody>
          <div className="d-flex justify-content-between align-items-start flex-wrap">
            <div>
              <h4 className="fs-13 mb-2 fw-bold text-uppercase text-muted">Total Visitors</h4>
              <div className="d-flex align-items-center gap-2 mb-2 py-1">
                <div className="avatar-md flex-shrink-0">
                  <span className="avatar-title text-bg-secondary rounded-circle">
                    <Icon icon="eye" className="fs-xxl" />
                  </span>
                </div>
                <h3 className="mb-0">
                  <CountUp start={0} end={82.3} duration={10} suffix="M" decimals={2} />
                </h3>
                <span className="badge fs-13 ms-auto badge-soft-success">
                  <Icon icon="arrow-up" /> 6.84%
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
          <div className="d-flex justify-content-between gap-1">
            <div style={{
            width: '69.40%'
          }}>
              <p className="mb-1 mt-2 text-muted text-uppercase fs-13 fw-medium">Mobile Phone</p>
              <h3 className="fw-normal mb-2 fs-xl">69.40%</h3>
              <div className="progress progress-lg rounded-0 rounded-start mb-1">
                <div className="progress-bar bg-secondary" role="progressbar" style={{
                width: '100%'
              }} aria-valuenow={100} />
              </div>
              <p className="text-muted mb-0">41,927 Sessions</p>
            </div>
            <div style={{
            width: '30.60%'
          }}>
              <p className="mb-1 mt-2 text-muted text-uppercase fs-13 fw-medium">Desktop</p>
              <h3 className="fw-normal mb-2 fs-xl">30.60%</h3>
              <div className="progress progress-lg rounded-0 rounded-end mb-1">
                <div className="progress-bar bg-info" role="progressbar" style={{
                width: '100%'
              }} aria-valuenow={100} />
              </div>
              <p className="text-muted mb-0">18,476 Sessions</p>
            </div>
          </div>
          <div className="table-responsive mb-n2 mt-3">
            <Table className="table-sm table-nowrap table-borderless table-centered mb-0">
              <thead className="bg-light bg-opacity-50 thead-sm">
                <tr className="text-uppercase fs-xxs">
                  <th>Goal</th>
                  <th>Completed</th>
                  <th>Target</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {visitorData.map((item, idx) => <tr key={idx}>
                    <td>{item.title}</td>
                    <td>{item.completed}</td>
                    <td>{item.target}</td>
                    <td>{item.progress}%</td>
                  </tr>)}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>
    </>;
};
export default TotalVisitors;