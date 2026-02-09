import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Icon as IconifyIcon } from '@iconify/react';
import { Link } from 'react-router';
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
const solarBrokenIconData = [{
  iconName: 'phone-broken',
  name: 'Phone'
}, {
  iconName: 'camera-broken',
  name: 'Camera'
}, {
  iconName: 'microphone-2-broken',
  name: 'Microphone'
}, {
  iconName: 'gamepad-broken',
  name: 'Gamepad'
}, {
  iconName: 'printer-broken',
  name: 'Printer'
}, {
  iconName: 'database-broken',
  name: 'Database'
}, {
  iconName: 'cloud-broken',
  name: 'Cloud'
}, {
  iconName: 'lock-keyhole-broken',
  name: 'Lock'
}, {
  iconName: 'key-broken',
  name: 'Key'
}, {
  iconName: 'shield-check-broken',
  name: 'Shield'
}, {
  iconName: 'letter-broken',
  name: 'Mail'
}, {
  iconName: 'user-broken',
  name: 'User'
}, {
  iconName: 'users-group-two-rounded-broken',
  name: 'Users'
}, {
  iconName: 'cart-3-broken',
  name: 'Cart'
}, {
  iconName: 'file-broken',
  name: 'File'
}, {
  iconName: 'book-2-broken',
  name: 'Book'
}, {
  iconName: 'bell-broken',
  name: 'Notification'
}, {
  iconName: 'settings-broken',
  name: 'Settings'
}, {
  iconName: 'calendar-broken',
  name: 'Calendar'
}, {
  iconName: 'flag-broken',
  name: 'Flag'
}, {
  iconName: 'music-note-3-broken',
  name: 'Music'
}, {
  iconName: 'upload-broken',
  name: 'Upload'
}, {
  iconName: 'download-broken',
  name: 'Download'
}, {
  iconName: 'home-broken',
  name: 'Home'
}, {
  iconName: 'user-broken',
  name: 'User'
}, {
  iconName: 'users-group-rounded-broken',
  name: 'Users'
}, {
  iconName: 'settings-broken',
  name: 'Settings'
}, {
  iconName: 'bell-broken',
  name: 'Notification'
}, {
  iconName: 'calendar-broken',
  name: 'Calendar'
}, {
  iconName: 'chat-round-dots-broken',
  name: 'Chat'
}, {
  iconName: 'phone-broken',
  name: 'Phone'
}, {
  iconName: 'camera-broken',
  name: 'Camera'
}, {
  iconName: 'music-note-3-broken',
  name: 'Music'
}, {
  iconName: 'heart-broken',
  name: 'Heart'
}, {
  iconName: 'like-broken',
  name: 'Like'
}, {
  iconName: 'star-broken',
  name: 'Star'
}, {
  iconName: 'map-point-broken',
  name: 'Location'
}, {
  iconName: 'compass-broken',
  name: 'Compass'
}, {
  iconName: 'map-broken',
  name: 'Map'
}, {
  iconName: 'compass-square-broken',
  name: 'Navigation'
}, {
  iconName: 'cart-broken',
  name: 'Cart'
}, {
  iconName: 'wallet-broken',
  name: 'Wallet'
}];
const Page = () => {
  return <>
      <PageBreadcrumb title="Solar Broken" subtitle="Icons" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="d-block">
              <CardTitle as="h4" className="mb-1 d-flex align-items-center gap-2">
                Overview
              </CardTitle>
              <p className="mb-0 text-muted">Solar Broken is a modern set of outline-style SVG icons, free to use and easy to customize with CSS.</p>
            </CardHeader>

            <CardBody>
              <h4 className="mt-0 fs-base mb-1">Usage</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="solar:camera-broken" className="fs-3" />
                <IconifyIcon icon="solar:heart-broken" className="fs-3" />
                <IconifyIcon icon="solar:star-broken" className="fs-3" />
                <IconifyIcon icon="solar:check-circle-broken" className="fs-3" />
                <IconifyIcon icon="solar:bell-broken" className="fs-3" />
                <IconifyIcon icon="solar:cloud-broken" className="fs-3" />
                <IconifyIcon icon="solar:user-broken" className="fs-3" />
              </div>
            </CardBody>

            <CardBody className="border-top border-dashed">
              <h4 className="mt-0 fs-base mb-1">Colors</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="solar:home-broken" className="fs-3 text-primary" />
                <IconifyIcon icon="solar:settings-broken" className="fs-3 text-secondary" />
                <IconifyIcon icon="solar:calendar-broken" className="fs-3 text-success" />
                <IconifyIcon icon="solar:chat-round-dots-broken" className="fs-3 text-info" />
                <IconifyIcon icon="solar:flag-broken" className="fs-3 text-warning" />
                <IconifyIcon icon="solar:folder-broken" className="fs-3 text-danger" />
                <IconifyIcon icon="solar:adhesive-plaster-broken" className="fs-3 text-light" />
                <IconifyIcon icon="solar:key-broken" className="fs-3 text-dark" />
                <IconifyIcon icon="solar:layers-broken" className="fs-3 text-purple" />
              </div>
            </CardBody>

            <CardBody className="border-top border-dashed">
              <h4 className="mt-0 fs-base mb-1">Sizes</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="solar:phone-broken" className="fs-1" />
                <IconifyIcon icon="solar:tag-price-broken" className="fs-2" />
                <IconifyIcon icon="solar:laptop-2-broken" className="fs-3" />
                <IconifyIcon icon="solar:tablet-broken" className="fs-4" />
                <IconifyIcon icon="solar:gamepad-broken" className="fs-5" />
                <IconifyIcon icon="solar:alarm-broken" className="fs-6" />
              </div>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="solar:watch-square-broken" />
                <IconifyIcon icon="solar:watch-square-broken" className="fs-sm" />
                <IconifyIcon icon="solar:watch-square-broken" className="fs-lg" />
                <IconifyIcon icon="solar:watch-square-broken" className="fs-xl" />
                <IconifyIcon icon="solar:watch-square-broken" className="fs-xxl" />
                <IconifyIcon icon="solar:watch-square-broken" className="fs-24" />
                <IconifyIcon icon="solar:watch-square-broken" className="fs-32" />
                <IconifyIcon icon="solar:watch-square-broken" className="fs-36" />
                <IconifyIcon icon="solar:watch-square-broken" className="fs-42" />
                <IconifyIcon icon="solar:watch-square-broken" className="fs-60" />
              </div>
            </CardBody>

            <CardBody className="border-top border-dashed">
              <h4 className="mt-0 mb-3">Icons</h4>

              <div className="d-flex flex-wrap align-items-center text-center gap-2">
                {solarBrokenIconData.map((item, idx) => <div className="avatar-xxl" key={idx}>
                    <span className="avatar-title flex-column gap-1 border border-dashed rounded-3 overflow-hidden text-truncate text-center p-1">
                      <IconifyIcon icon={`solar:${item.iconName}`} className="fs-xxl" />
                      <span className="fw-semibold d-block w-100 text-truncate">{item.name}</span>
                    </span>
                  </div>)}
              </div>

              <div className="text-center mt-3">
                <Link to="https://icon-sets.iconify.design/solar/?suffixes=Broken" target="_blank" className="btn btn-danger">
                  View All Icons
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Page;