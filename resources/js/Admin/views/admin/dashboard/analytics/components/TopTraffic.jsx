import Icon from '@admin/components/wrappers/Icon';
import { Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
import { trafficSourceData } from './data';
const TopTraffic = () => {
  return <>
      <Card>
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">
            Top Traffic Sources
            <span data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Shows which channels drive the most traffic.">
              <Icon icon="info-circle" className="text-muted ms-1" />
            </span>
          </CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="chart-bar" className="me-2" /> View Detailed Report
              </DropdownItem>
              <DropdownItem>
                <Icon icon="download" className="me-2" /> Export Traffic Data
              </DropdownItem>
              <DropdownItem>
                <Icon icon="filter-2" className="me-2" /> Filter by Source
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem className="text-danger">
                <Icon icon="trash" className="me-2" /> Remove Widget
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody>
          <Row>
            <Col>
              {trafficSourceData.slice(0, 5).map((item, idx) => <div className="custom-progress mb-3" key={idx}>
                  <div className="progress-info d-flex justify-content-between align-items-center">
                    <div>
                      <img src={item.image} alt="user-image" className="me-1" height={24} />
                      <span className="align-middle fw-semibold fs-md">{item.name}</span>
                    </div>
                    <span className="fw-semibold text-muted float-end">{item.value}K</span>
                  </div>
                  <div className={`progress-data bg-${item.variant}`} style={{
                width: `${item.progress}%`
              }} />
                </div>)}
            </Col>
            <Col>
              {trafficSourceData.slice(5, 10).map((item, idx) => <div className="custom-progress mb-3" key={idx}>
                  <div className="progress-info d-flex justify-content-between align-items-center">
                    <div>
                      <img src={item.image} alt="user-image" className="me-1" height={24} />
                      <span className="align-middle fw-semibold fs-md">{item.name}</span>
                    </div>
                    <span className="fw-semibold text-muted float-end">{item.value}K</span>
                  </div>
                  <div className={`progress-data bg-${item.variant}`} style={{
                width: `${item.progress}%`
              }} />
                </div>)}
            </Col>
          </Row>
        </CardBody>
      </Card>
    </>;
};
export default TopTraffic;