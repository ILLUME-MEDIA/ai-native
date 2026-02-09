import { Icon as IconifyIcon } from '@iconify/react';
import { Card, CardBody, Col } from 'react-bootstrap';
import { weatherStatData } from './data';
const WeatherForecast = () => {
  return <>
      {weatherStatData.map((item, idx) => <Col key={idx}>
          <Card className={`${item.isActive ? 'border-0 text-white' : ''}`} style={item.isActive && item.image ? {
        backgroundImage: `url(${item.image})`,
        backgroundSize: 'cover'
      } : {}}>
            <CardBody className={`${item.isActive ? 'bg-gradient bg-secondary bg-opacity-90' : ''}`}>
              <h5 className={`fs-13 text-uppercase ${item.isActive ? 'text-white-75' : 'text-muted'}`}>{item.day}</h5>
              <div className="d-flex align-items-center justify-content-center gap-2 my-3">
                <div className="avatar-md flex-shrink-0">
                  <span className={`avatar-title ${item.className} rounded-circle fs-22`}>
                    <IconifyIcon icon={item.icon} />
                  </span>
                </div>
                <h3 className="mb-0 fw-bold">{item.temperature}</h3>
              </div>
              <p className={`mb-1 text-center ${item.isActive ? 'text-white' : 'text-muted'}`}>{item.status}</p>
              <p className={`mb-0 text-center gap-3 d-flex justify-content-center ${item.isActive ? 'text-white-75' : 'text-muted'}`}>
                <span>
                  <IconifyIcon icon="tabler:wind" /> {item.wind}
                </span>
                <span>
                  <IconifyIcon icon="tabler:droplet" /> {item.humidity}
                </span>
              </p>
            </CardBody>
          </Card>
        </Col>)}
    </>;
};
export default WeatherForecast;