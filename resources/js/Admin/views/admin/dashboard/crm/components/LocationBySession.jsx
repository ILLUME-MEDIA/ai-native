import BaseVectorMap from '@admin/components/maps/BaseVectorMap';
import Icon from '@admin/components/wrappers/Icon';
import { getColor } from '@admin/utils/helpers';
import { Card, CardBody, CardHeader, CardTitle, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
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
      fill: getColor('primary') // highlight color
    }
  },
  selectedRegions: ['AU', 'US', 'IN']
});
const LocationBySession = () => {
  return <>
      <Card>
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">Location By Session</CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="world" className="me-2" /> Show Top Countries
              </DropdownItem>
              <DropdownItem>
                <Icon icon="map-pin" className="me-2" /> View City Breakdown
              </DropdownItem>
              <DropdownItem>
                <Icon icon="calendar" className="me-2" /> Compare Date Range
              </DropdownItem>
              <DropdownItem>
                <Icon icon="download" className="me-2" /> Download Report
              </DropdownItem>
              <hr className="dropdown-divider" />
              <DropdownItem className="text-danger">
                <Icon icon="trash" className="me-2" /> Clear Filters
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody>
          <BaseVectorMap id="session-by-countries" options={getWorldMarkerLineOptions()} style={{
          height: 203
        }} />

          <div className="mt-3">
            <div className="table-responsive mb-n1">
              <table className="table table-nowrap table-borderless table-centered mb-0">
                <thead className="bg-light bg-opacity-50 thead-sm">
                  <tr>
                    <th>Country</th>
                    <th>Sessions</th>
                    <th>Users</th>
                    <th>Perc.</th>
                  </tr>
                </thead>
                <tbody>
                  {countryData.map((item, idx) => <tr key={idx}>
                      <td>
                        <img src={item.country.image} alt="user-image" className="me-1 rounded-circle" height={18} />
                        <span className="align-middle">{item.country.name}</span>
                      </td>
                      <td>{item.sessions}</td>
                      <td>{item.users}</td>
                      <td>{item.percentage}</td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </CardBody>
      </Card>
    </>;
};
export default LocationBySession;