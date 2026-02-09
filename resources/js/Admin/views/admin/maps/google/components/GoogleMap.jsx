import { AdvancedMarker, APIProvider, Map, Pin } from '@vis.gl/react-google-maps';
import { Card, CardBody, CardHeader, Col } from 'react-bootstrap';
const GoogleMap = () => {
  return <>
      <Col xl={6}>
        <BasicGoogleMap />
      </Col>
      <Col xl={6}>
        <StreetViewGoogleMap />
      </Col>
      <Col xl={6}>
        <DarkGoogleMap />
      </Col>
    </>;
};
export default GoogleMap;
export const BasicGoogleMap = () => {
  return <Card>
      <CardHeader className="d-block">
        <h5 className="mb-1 card-title">Basic Google Map</h5>
        <p className="text-muted mb-0">Displays a basic embedded Google Map.</p>
      </CardHeader>
      <CardBody>
        <APIProvider apiKey={''}>
          <Map defaultCenter={{
          lat: 37.8,
          lng: -122.4
        }} defaultZoom={14} style={{
          width: '100%',
          height: '360px'
        }} />
        </APIProvider>
      </CardBody>
    </Card>;
};
export const StreetViewGoogleMap = () => {
  return <Card>
      <CardHeader className="d-block">
        <h5 className="mb-1 card-title">Street View Google Map</h5>
        <p className="text-muted mb-0">Displays a satellite-styled view of the map.</p>
      </CardHeader>
      <CardBody>
        <APIProvider apiKey={''}>
          <Map mapId="bf51a910020fa25b" style={{
          width: '100%',
          height: '360px'
        }} defaultCenter={{
          lat: 37.8,
          lng: -122.4
        }} defaultZoom={10}>
            <AdvancedMarker position={{
            lat: 37.8,
            lng: -122.4
          }} title="AdvancedMarker with customized pin.">
              <Pin />
            </AdvancedMarker>
            <AdvancedMarker position={{
            lat: 37.7,
            lng: -122.48
          }} title="AdvancedMarker with custom html content.">
              <div style={{
              width: 20,
              height: 20,
              position: 'absolute',
              top: 0,
              left: 0,
              background: '#1dbe80',
              border: '2px solid #0e6443',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)'
            }}></div>
            </AdvancedMarker>
          </Map>
        </APIProvider>
      </CardBody>
    </Card>;
};
export const DarkGoogleMap = () => {
  return <Card>
      <CardHeader className="d-block">
        <h5 className="mb-1 card-title">Dark Google Map</h5>
        <p className="text-muted mb-0">A dark-mode styled map using CSS filters.</p>
      </CardHeader>
      <CardBody>
        <APIProvider apiKey={''}>
          <Map defaultCenter={{
          lat: 37.8,
          lng: -122.4
        }} defaultZoom={14} mapId="49ae42fed52588c3" mapTypeId="hybrid" gestureHandling="greedy" disableDefaultUI={true} style={{
          width: '100%',
          height: '360px'
        }} />
        </APIProvider>
      </CardBody>
    </Card>;
};