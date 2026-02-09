import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Icon as IconifyIcon } from '@iconify/react';
import { Link } from 'react-router';
import { Card, CardBody, CardHeader, Col, Row } from 'react-bootstrap';
const solarDuotoneIconData = [{
  iconName: 'phone-bold-duotone',
  name: 'Phone'
}, {
  iconName: 'camera-bold-duotone',
  name: 'Camera'
}, {
  iconName: 'microphone-2-bold-duotone',
  name: 'Microphone'
}, {
  iconName: 'gamepad-bold-duotone',
  name: 'Gamepad'
}, {
  iconName: 'printer-bold-duotone',
  name: 'Printer'
}, {
  iconName: 'database-bold-duotone',
  name: 'Database'
}, {
  iconName: 'cloud-bold-duotone',
  name: 'Cloud'
}, {
  iconName: 'lock-keyhole-bold-duotone',
  name: 'Lock'
}, {
  iconName: 'key-bold-duotone',
  name: 'Key'
}, {
  iconName: 'shield-check-bold-duotone',
  name: 'Shield'
}, {
  iconName: 'letter-bold-duotone',
  name: 'Mail'
}, {
  iconName: 'chat-round-dots-bold-duotone',
  name: 'Chat'
}, {
  iconName: 'like-bold-duotone',
  name: 'Like'
}, {
  iconName: 'star-bold-duotone',
  name: 'Star'
}, {
  iconName: 'map-point-bold-duotone',
  name: 'Location'
}, {
  iconName: 'compass-bold-duotone',
  name: 'Compass'
}, {
  iconName: 'map-bold-duotone',
  name: 'Map'
}, {
  iconName: 'home-bold-duotone',
  name: 'Home'
}, {
  iconName: 'user-bold-duotone',
  name: 'User'
}, {
  iconName: 'users-group-rounded-bold-duotone',
  name: 'Users'
}, {
  iconName: 'settings-bold-duotone',
  name: 'Settings'
}, {
  iconName: 'calendar-bold-duotone',
  name: 'Calendar'
}, {
  iconName: 'bell-bold-duotone',
  name: 'Notification'
}, {
  iconName: 'lock-keyhole-bold-duotone',
  name: 'Lock'
}, {
  iconName: 'key-bold-duotone',
  name: 'Key'
}, {
  iconName: 'shield-user-bold-duotone',
  name: 'Security'
}, {
  iconName: 'chart-bold-duotone',
  name: 'Chart'
}, {
  iconName: 'wallet-bold-duotone',
  name: 'Wallet'
}, {
  iconName: 'document-bold-duotone',
  name: 'Document'
}, {
  iconName: 'folder-bold-duotone',
  name: 'Folder'
}, {
  iconName: 'play-circle-bold-duotone',
  name: 'Play'
}, {
  iconName: 'pause-circle-bold-duotone',
  name: 'Pause'
}, {
  iconName: 'stop-circle-bold-duotone',
  name: 'Stop'
}, {
  iconName: 'upload-minimalistic-bold-duotone',
  name: 'Upload'
}, {
  iconName: 'bluetooth-bold-duotone',
  name: 'Bluetooth'
}, {
  iconName: 'battery-charge-bold-duotone',
  name: 'Battery'
}, {
  iconName: 'sun-2-bold-duotone',
  name: 'Light'
}, {
  iconName: 'moon-bold-duotone',
  name: 'Dark'
}, {
  iconName: 'bookmark-bold-duotone',
  name: 'Bookmark'
}, {
  iconName: 'chat-dots-bold-duotone',
  name: 'Message'
}, {
  iconName: 'settings-minimalistic-bold-duotone',
  name: 'Settings'
}, {
  iconName: 'folder-open-bold-duotone',
  name: 'Folder Open'
}];
const Page = () => {
  return <>
      <PageBreadcrumb title="Solar Duotone" subtitle="Icons" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="d-block">
              <h4 className="card-title mb-1 d-flex align-items-center gap-2">Overview</h4>
              <p className="mb-0 text-muted">Solar Duotone Solid is a bold, modern SVG icon set with a filled dual-tone style. Free for personal and commercial use.</p>
            </CardHeader>

            <CardBody>
              <h4 className="mt-0 fs-base mb-1">Usage</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="solar:camera-bold-duotone" className="fs-3" />
                <IconifyIcon icon="solar:heart-bold-duotone" className="fs-3" />
                <IconifyIcon icon="solar:star-bold-duotone" className="fs-3" />
                <IconifyIcon icon="solar:check-circle-bold-duotone" className="fs-3" />
                <IconifyIcon icon="solar:bell-bold-duotone" className="fs-3" />
                <IconifyIcon icon="solar:cloud-bold-duotone" className="fs-3" />
                <IconifyIcon icon="solar:user-bold-duotone" className="fs-3" />
              </div>
            </CardBody>

            <CardBody className="border-top border-dashed">
              <h4 className="mt-0 fs-base mb-1">Colors</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="solar:home-bold-duotone" className="fs-3 text-primary" />
                <IconifyIcon icon="solar:settings-bold-duotone" className="fs-3 text-secondary" />
                <IconifyIcon icon="solar:calendar-bold-duotone" className="fs-3 text-success" />
                <IconifyIcon icon="solar:chat-round-dots-bold-duotone" className="fs-3 text-info" />
                <IconifyIcon icon="solar:flag-bold-duotone" className="fs-3 text-warning" />
                <IconifyIcon icon="solar:folder-bold-duotone" className="fs-3 text-danger" />
                <IconifyIcon icon="solar:adhesive-plaster-bold-duotone" className="fs-3 text-light" />
                <IconifyIcon icon="solar:key-bold-duotone" className="fs-3 text-dark" />
                <IconifyIcon icon="solar:layers-bold-duotone" className="fs-3 text-purple" />
              </div>
            </CardBody>

            <CardBody className="border-top border-dashed">
              <h4 className="mt-0 fs-base mb-1">Sizes</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="solar:phone-bold-duotone" className="fs-1" />
                <IconifyIcon icon="solar:tag-price-bold-duotone" className="fs-2" />
                <IconifyIcon icon="solar:laptop-2-bold-duotone" className="fs-3" />
                <IconifyIcon icon="solar:tablet-bold-duotone" className="fs-4" />
                <IconifyIcon icon="solar:gamepad-bold-duotone" className="fs-5" />
                <IconifyIcon icon="solar:alarm-bold-duotone" className="fs-6" />
              </div>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="solar:watch-square-bold-duotone" />
                <IconifyIcon icon="solar:watch-square-bold-duotone" className="fs-sm" />
                <IconifyIcon icon="solar:watch-square-bold-duotone" className="fs-lg" />
                <IconifyIcon icon="solar:watch-square-bold-duotone" className="fs-xl" />
                <IconifyIcon icon="solar:watch-square-bold-duotone" className="fs-xxl" />
                <IconifyIcon icon="solar:watch-square-bold-duotone" className="fs-24" />
                <IconifyIcon icon="solar:watch-square-bold-duotone" className="fs-32" />
                <IconifyIcon icon="solar:watch-square-bold-duotone" className="fs-36" />
                <IconifyIcon icon="solar:watch-square-bold-duotone" className="fs-42" />
                <IconifyIcon icon="solar:watch-square-bold-duotone" className="fs-60" />
              </div>
            </CardBody>

            <CardBody className="border-top border-dashed">
              <h4 className="mt-0 mb-3">Icons</h4>

              <div className="d-flex flex-wrap align-items-center text-center gap-2">
                {solarDuotoneIconData.map((item, idx) => <div className="avatar-xxl" key={idx}>
                    <span className="avatar-title flex-column gap-1 border border-dashed rounded-3 overflow-hidden text-truncate text-center p-1">
                      <IconifyIcon icon={`solar:${item.iconName}`} className="fs-xxl" />
                      <span className="fw-semibold d-block w-100 text-truncate">{item.name}</span>
                    </span>
                  </div>)}
              </div>

              <div className="text-center mt-3">
                <Link to="https://icon-sets.iconify.design/solar/?suffixes=Bold+Duotone" target="_blank" className="btn btn-danger">
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