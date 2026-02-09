import BaseVectorMap from '@admin/components/maps/BaseVectorMap';
import Icon from "@admin/components/wrappers/Icon";
import { getColor } from "@admin/utils/helpers";
import { Card, CardBody, CardHeader, CardTitle, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from "react-bootstrap";
const getWorldMarkerLineOptions = () => ({
  map: "world",
  zoomOnScroll: false,
  zoomButtons: false,
  markers: [{
    name: "Australia",
    coords: [-25.2744, 133.7751]
  }, {
    name: "India",
    coords: [20.5937, 78.9629]
  }, {
    name: "Japan",
    coords: [36.2048, 138.2529]
  }, {
    name: "South Africa",
    coords: [-30.5595, 22.9375]
  }, {
    name: "Germany",
    coords: [51.1657, 10.4515]
  }, {
    name: "United Kingdom",
    coords: [55.3781, -3.436]
  }, {
    name: "Mexico",
    coords: [23.6345, -102.5528]
  }, {
    name: "Argentina",
    coords: [-38.4161, -63.6167]
  }, {
    name: "Saudi Arabia",
    coords: [23.8859, 45.0792]
  }, {
    name: "Indonesia",
    coords: [-0.7893, 113.9213]
  }],
  lines: [{
    from: "India",
    to: "Australia"
  }, {
    from: "Japan",
    to: "Germany"
  }, {
    from: "Mexico",
    to: "United Kingdom"
  }, {
    from: "Argentina",
    to: "South Africa"
  }, {
    from: "Saudi Arabia",
    to: "India"
  }, {
    from: "Indonesia",
    to: "Japan"
  }, {
    from: "United Kingdom",
    to: "Germany"
  }, {
    from: "Australia",
    to: "Indonesia"
  }],
  regionStyle: {
    initial: {
      stroke: "#aab9d14d",
      strokeWidth: 0.25,
      fill: "#aab9d14d",
      fillOpacity: 1
    }
  },
  markerStyle: {
    initial: {
      fill: getColor("secondary")
    },
    selected: {
      fill: getColor("secondary")
    }
  },
  lineStyle: {
    animation: true,
    strokeDasharray: "1 2 3 4 5 6"
  }
});
const RevenueByLocation = () => {
  return <>
      <Card className="card-h-100">
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">Revenue By Locations</CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="map" className="me-2" /> View Full Map
              </DropdownItem>
              <DropdownItem>
                <Icon icon="download" className="me-2" /> Export Revenue Data
              </DropdownItem>
              <DropdownItem>
                <Icon icon="filter-2" className="me-2" /> Filter By Region
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem className="text-danger">
                <Icon icon="trash" className="me-2" /> Remove Widget
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody className="pt-1">
          <BaseVectorMap id="revenue-by-location" options={getWorldMarkerLineOptions()} style={{
          height: 206
        }} />
          <div className="mt-3">
            <div className="p-2 mb-3 border-dashed border rounded">
              <div className="d-flex align-items-center">
                <div className="avatar-lg flex-shrink-0 me-2">
                  <span className="avatar-title bg-warning-subtle rounded-circle fs-1">
                    <Icon icon="medal" className="text-warning" />
                  </span>
                </div>
                <div className="flex-gow-1">
                  <h5 className="mb-0 fw-semibold">Congratulations !...</h5>
                  <p className="mb-0 text-muted">
                    You've just hit a new record..
                  </p>
                </div>
                <div className="ms-auto">
                  <h4 className="fs-16 mt-1 mb-0">25.9k</h4>
                  <span className="text-muted fw-semibold fs-12">ORDERS</span>
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center mb-2 gap-2">
              <Icon icon="circle" className="text-info fs-md" />
              <div>United States</div>
              <p className="mb-0 ms-auto">
                <span className="fw-semibold">$48.6k</span>{" "}
                <span className="text-muted">Revenue</span>
              </p>
            </div>
            <div className="d-flex align-items-center mb-2 gap-2">
              <Icon icon="circle" className="text-primary fs-md" />
              <div>United Kingdom</div>
              <p className="mb-0 ms-auto">
                <span className="fw-semibold">$26.4k</span>{" "}
                <span className="text-muted">Revenue</span>
              </p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Icon icon="circle" className="text-secondary fs-md" />
              <div>Australia</div>
              <p className="mb-0 ms-auto">
                <span className="fw-semibold">$18.9k</span>{" "}
                <span className="text-muted">Revenue</span>
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </>;
};
export default RevenueByLocation;