import BaseVectorMap from '@admin/components/maps/BaseVectorMap';
import Icon from '@admin/components/wrappers/Icon';
import { getColor } from '@admin/utils/helpers';
import React from 'react';
import { Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
import { countryData } from './data';
const getWorldMarkerLineOptions = () => ({
  map: 'world',
  zoomOnScroll: false,
  zoomButtons: true,
  regionStyle: {
    initial: {
      stroke: '#aab9d14d',
      strokeWidth: 0.25,
      fill: '#aab9d14d',
      fillOpacity: 1
    },
    selected: {
      fill: getColor('primary')
    }
  },
  selectedRegions: ['CA', 'US', 'RU', 'IN']
});
const UserGeography = () => {
  return <>
      <Card>
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">
            User Geography Intelligence
            <span data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Deep insight into user distribution across the globe.">
              <Icon icon="info-circle" className="text-muted ms-1" />
            </span>
          </CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="map" className="me-2" /> Open Geo Visualization
              </DropdownItem>
              <DropdownItem>
                <Icon icon="download" className="me-2" /> Export Geo Metrics
              </DropdownItem>
              <DropdownItem>
                <Icon icon="filter-2" className="me-2" /> Country Filters
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem className="text-danger">
                <Icon icon="trash" className="me-2" /> Remove Widget
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody className="pt-0">
          <Row className="align-items-center">
            <Col lg="7">
              <BaseVectorMap id="world-map-marker-line" options={getWorldMarkerLineOptions()} style={{
              height: 300
            }} />
            </Col>
            <Col lg="5" dir="ltr">
              <div className="p-3">
                {countryData.map((item, idx) => <React.Fragment key={idx}>
                    <div className="d-flex justify-content-between align-items-center">
                      <p className="mb-1">
                        <img src={item.flag} alt="user-image" className="me-1 rounded-circle" height={20} />
                        <span className="align-middle">{item.name}</span>
                      </p>
                      <div>
                        <h5 className="fw-semibold mb-0">{item.value}</h5>
                      </div>
                    </div>
                    <Row className="align-items-center mb-3">
                      <Col>
                        <div className="progress progress-soft progress-sm">
                          <div className={`progress-bar bg-${item.variant}`} role="progressbar" style={{
                        width: `${item.progress}%`
                      }} aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100} />
                        </div>
                      </Col>
                      <Col xs="auto">
                        <p className="mb-0 text-muted fs-13">{item.progress}%</p>
                      </Col>
                    </Row>
                  </React.Fragment>)}
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </>;
};
export default UserGeography;