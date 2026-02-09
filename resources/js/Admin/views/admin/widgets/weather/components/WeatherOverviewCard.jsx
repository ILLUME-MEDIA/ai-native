import small6 from '@admin/assets/images/stock/small-6.jpg';
import { Icon as IconifyIcon } from '@iconify/react';
import { Card, Col, Row } from 'react-bootstrap';
import { cityWeatherData } from './data';
const WeatherOverviewCard = () => {
  return <>
      <Card className="overflow-hidden">
        <div className="position-relative" style={{
        height: 200,
        background: `url(${small6}) center/cover`
      }}>
          <div className="position-absolute top-0 start-0 bg-dark text-white text-center px-3 py-2 rounded-end-3 mt-3">
            <div className="fw-bold">OCT</div>
            <div className="fw-bold fs-5">21</div>
          </div>
          <div className="position-absolute bottom-0 start-0 text-white p-3">
            <div className="fs-5">Cloudy</div>
            <h2 className="fw-bold">69°</h2>
          </div>
          <ul className="nav nav-tabs border-0 position-absolute bottom-0 end-0 p-2">
            <li className="nav-item">
              <button className="nav-link active bg-transparent text-white fw-semibold border-0 border-bottom border-white rounded-0" data-bs-toggle="tab" data-bs-target="#todayTab">
                Today
              </button>
            </li>
            <li className="nav-item">
              <button className="nav-link bg-transparent text-white-50 fw-semibold border-0 rounded-0" data-bs-toggle="tab" data-bs-target="#weekTab">
                Week
              </button>
            </li>
          </ul>
        </div>
        <div className="p-3">
          <Row className="text-center">
            <Col>
              <div className="fw-semibold text-muted">Now</div>
              <IconifyIcon icon="tabler:cloud" className="ti fs-2 my-1 d-inline-flex" />
              <div className="fw-semibold">72°</div>
            </Col>
            <Col>
              <div className="fw-semibold text-muted">2pm</div>
              <IconifyIcon icon="tabler:cloud-bolt" className="ti fs-2 my-1 d-inline-flex" />
              <div className="fw-semibold">74°</div>
            </Col>
            <Col>
              <div className="fw-semibold text-muted">3pm</div>
              <IconifyIcon icon="tabler:sun-high" className="ti fs-2 my-1 d-inline-flex" />
              <div className="fw-semibold">76°</div>
            </Col>
            <Col>
              <div className="fw-semibold text-muted">4pm</div>
              <IconifyIcon icon="tabler:sun" className="ti fs-2 my-1 d-inline-flex" />
              <div className="fw-semibold">75°</div>
            </Col>
            <Col>
              <div className="fw-semibold text-muted">5pm</div>
              <IconifyIcon icon="tabler:cloud-rain" className="ti fs-2 my-1 d-inline-flex" />
              <div className="fw-semibold">71°</div>
            </Col>
          </Row>
        </div>
      </Card>
      <Row>
        {cityWeatherData.map((item, idx) => <Col sm="6" key={idx}>
            <Card className="text-white overflow-hidden">
              <div style={{
            background: `url(${item.image}) center/cover`
          }}>
                <div className="w-100 h-100 d-flex flex-column justify-content-end p-3 bg-dark bg-gradient bg-opacity-75">
                  <div className="fw-bold fs-28">{item.temperature}</div>
                  <div className="fw-semibold fs-5">{item.city}</div>
                  <div className="text-white-50">{item.status}</div>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-dark text-white text-opacity-75">
                <div className="d-flex align-items-center gap-1">
                  <IconifyIcon icon="tabler:wind" /> <span>{item.wind.speed}</span>
                </div>
                <div className="d-flex align-items-center gap-1">
                  <IconifyIcon icon="tabler:compass" /> <span>{item.wind.direction}</span>
                </div>
              </div>
            </Card>
          </Col>)}
      </Row>
    </>;
};
export default WeatherOverviewCard;