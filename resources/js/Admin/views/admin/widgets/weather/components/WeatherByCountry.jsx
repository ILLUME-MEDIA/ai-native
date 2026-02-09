import Icon from '@admin/components/wrappers/Icon';
import { SimpleBar } from '@admin/components/wrappers/SimpleBar';
import { Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
import { countryWeatherData } from './data';
const WeatherByCountry = () => {
  return <>
      <Card>
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">Weather by Country</CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align={'end'}>
              <DropdownItem>
                <Icon icon="report" className="me-2" /> View Full Weather Report
              </DropdownItem>
              <DropdownItem>
                <Icon icon="download" className="me-2" /> Export Data
              </DropdownItem>
              <DropdownItem>
                <Icon icon="filter" className="me-2" /> Filter Countries
              </DropdownItem>
              <hr className="dropdown-divider" />
              <DropdownItem className="text-danger">
                <Icon icon="trash" className="me-2" /> Remove Widget
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody className="py-2 px-0">
          <SimpleBar className="px-3" style={{
          height: 415
        }}>
            {countryWeatherData.map((item, idx) => <Row className="align-items-center g-0 py-2" key={idx}>
                <Col xs="4" className="d-flex align-items-center">
                  <img src={item.country.image} alt="" className="me-2 rounded-circle" height={26} />
                  <span className="fw-semibold fs-16">{item.country.name}</span>
                </Col>
                <Col xs="4" className="text-end text-muted">
                  <div className="fw-semibold">
                    {item.temperature} <span className="text-muted fs-12">(Feels {item.feelsLike}°)</span>
                  </div>
                  <div className="fw-semibold fs-12">
                    <Icon icon="droplet" /> {item.humidity} | <Icon icon="wind" /> {item.wind}
                  </div>
                </Col>
                <Col xs="4" className={`${item.className} fw-semibold text-end`}>
                  <Icon icon={item.icon} /> {item.status}
                </Col>
              </Row>)}
          </SimpleBar>
        </CardBody>
      </Card>
    </>;
};
export default WeatherByCountry;