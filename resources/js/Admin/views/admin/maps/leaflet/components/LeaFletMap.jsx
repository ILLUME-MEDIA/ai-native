import { Card, CardBody, CardHeader, CardTitle, Col } from 'react-bootstrap';
import BasicMap from './BasicMap';
import CustomIcon from './CustomIcons';
import DraggableMarker from './DraggableMarker';
import LayerControl from './LayerControl';
import ShapeMap from './ShapeMap';
import UserLocationMap from './UserLocationMap';
const LeaFletMap = () => {
  return <>
      <Col xl={6}>
        <Card>
          <CardHeader className="d-block">
            <CardTitle as="h5" className="mb-1">
              Basic Map
            </CardTitle>
            <p className="text-muted mb-0">A simple Leaflet map centered with default tile layer and controls.</p>
          </CardHeader>
          <CardBody>
            <BasicMap />
          </CardBody>
        </Card>
      </Col>

      <Col xl={6}>
        <Card>
          <CardHeader className="d-block">
            <CardTitle as="h5" className="mb-1">
              Marker, Circle & Polygon
            </CardTitle>
            <p className="text-muted mb-0">Shows how to add interactive markers, circles, and polygons on the map.</p>
          </CardHeader>
          <CardBody>
            <ShapeMap />
          </CardBody>
        </Card>
      </Col>

      <Col xl={6}>
        <Card>
          <CardHeader className="d-block">
            <CardTitle as="h5" className="mb-1">
              Draggable Marker with Popup
            </CardTitle>
            <p className="text-muted mb-0">Allows dragging a marker with a popup that displays dynamic content.</p>
          </CardHeader>
          <CardBody>
            <DraggableMarker />
          </CardBody>
        </Card>
      </Col>
      <Col xl={6}>
        <Card>
          <CardHeader className="d-block">
            <CardTitle as="h5" className="mb-1">
              User Location
            </CardTitle>
            <p className="text-muted mb-0">Uses the browser&apos;s geolocation API to show the user&apos; current location.</p>
          </CardHeader>
          <CardBody>
            <UserLocationMap />
          </CardBody>
        </Card>
      </Col>

      <Col xl={6}>
        <Card>
          <CardHeader className="d-block">
            <CardTitle as="h5" className="mb-1">
              Custom Icons
            </CardTitle>
            <p className="text-muted mb-0">Demonstrates using custom image icons for Leaflet map markers.</p>
          </CardHeader>
          <CardBody>
            <CustomIcon />
          </CardBody>
        </Card>
      </Col>

      <Col xl={6}>
        <Card>
          <CardHeader className="d-block">
            <CardTitle as="h5" className="mb-1">
              Layer Control
            </CardTitle>
            <p className="text-muted mb-0">Toggles between multiple map layers or overlays using Leaflet’s layer control.</p>
          </CardHeader>
          <CardBody>
            <LayerControl />
          </CardBody>
        </Card>
      </Col>
    </>;
};
export default LeaFletMap;