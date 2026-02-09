import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Icon as IconifyIcon } from '@iconify/react';
import { Link } from 'react-router';
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
const remixIconData = [{
  iconName: 'phone-line',
  name: 'Phone'
}, {
  iconName: 'percent-line',
  name: 'Discount'
}, {
  iconName: 'headphone-line',
  name: 'Headphones'
}, {
  iconName: 'camera-line',
  name: 'Camera'
}, {
  iconName: 'mic-line',
  name: 'Microphone'
}, {
  iconName: 'gamepad-line',
  name: 'Gamepad'
}, {
  iconName: 'printer-line',
  name: 'Printer'
}, {
  iconName: 'database-2-line',
  name: 'Database'
}, {
  iconName: 'cloud-line',
  name: 'Cloud'
}, {
  iconName: 'wifi-line',
  name: 'Wi-Fi'
}, {
  iconName: 'lock-line',
  name: 'Lock'
}, {
  iconName: 'key-2-line',
  name: 'Key'
}, {
  iconName: 'shield-line',
  name: 'Shield'
}, {
  iconName: 'mail-line',
  name: 'Mail'
}, {
  iconName: 'user-3-line',
  name: 'User'
}, {
  iconName: 'group-line',
  name: 'Users'
}, {
  iconName: 'shopping-cart-line',
  name: 'Cart'
}, {
  iconName: 'briefcase-line',
  name: 'Briefcase'
}, {
  iconName: 'file-text-line',
  name: 'File'
}, {
  iconName: 'book-2-line',
  name: 'Book'
}, {
  iconName: 'search-line',
  name: 'Search'
}, {
  iconName: 'bell-line',
  name: 'Notification'
}, {
  iconName: 'settings-3-line',
  name: 'Settings'
}, {
  iconName: 'calendar-line',
  name: 'Calendar'
}, {
  iconName: 'flag-line',
  name: 'Flag'
}, {
  iconName: 'camera-line',
  name: 'Camera'
}, {
  iconName: 'music-2-line',
  name: 'Music'
}, {
  iconName: 'movie-line',
  name: 'Movie'
}, {
  iconName: 'upload-line',
  name: 'Upload'
}, {
  iconName: 'download-line',
  name: 'Download'
}, {
  iconName: 'facebook-circle-line',
  name: 'Facebook'
}, {
  iconName: 'twitter-x-line',
  name: 'Twitter X'
}, {
  iconName: 'instagram-line',
  name: 'Instagram'
}, {
  iconName: 'linkedin-box-line',
  name: 'LinkedIn'
}, {
  iconName: 'github-line',
  name: 'GitHub'
}, {
  iconName: 'youtube-line',
  name: 'YouTube'
}, {
  iconName: 'map-pin-line',
  name: 'Location'
}, {
  iconName: 'send-plane-line',
  name: 'Send'
}, {
  iconName: 'chat-3-line',
  name: 'Chat'
}, {
  iconName: 'thumb-up-line',
  name: 'Like'
}, {
  iconName: 'error-warning-line',
  name: 'Warning'
}, {
  iconName: 'check-double-line',
  name: 'Done'
}];
const Page = () => {
  return <>
      <PageBreadcrumb title="Remix" subtitle="Icons" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="d-block">
              <CardTitle as="h4" className="mb-1 d-flex align-items-center gap-2">
                Overview
              </CardTitle>
              <p className="mb-0 text-muted">Open-source neutral-style system symbols elaborately crafted for designers and developers. All of the icons are free for both personal and commercial use.</p>
            </CardHeader>

            <CardBody>
              <h4 className="mt-0 fs-base mb-1">Usage</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="ri:camera-line" className="fs-3" />
                <IconifyIcon icon="ri:heart-line" className="fs-3" />
                <IconifyIcon icon="ri:star-line" className="fs-3" />
                <IconifyIcon icon="ri:check-line" className="fs-3" />
                <IconifyIcon icon="ri:notification-3-line" className="fs-3" />
                <IconifyIcon icon="ri:cloud-line" className="fs-3" />
                <IconifyIcon icon="ri:user-line" className="fs-3" />
              </div>
            </CardBody>

            <CardBody className="border-top border-dashed">
              <h4 className="mt-0 fs-base mb-1">Colors</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="ri:home-4-line" className="fs-3 text-primary" />
                <IconifyIcon icon="ri:settings-3-line" className="fs-3 text-secondary" />
                <IconifyIcon icon="ri:calendar-line" className="fs-3 text-success" />
                <IconifyIcon icon="ri:message-3-line" className="fs-3 text-info" />
                <IconifyIcon icon="ri:flag-line" className="fs-3 text-warning" />
                <IconifyIcon icon="ri:folder-line" className="fs-3 text-danger" />
                <IconifyIcon icon="ri:global-line" className="fs-3 text-light" />
                <IconifyIcon icon="ri:key-2-line" className="fs-3 text-dark" />
                <IconifyIcon icon="ri:stack-line" className="fs-3 text-purple" />
              </div>
            </CardBody>

            <CardBody className="border-top border-dashed">
              <h4 className="mt-0 fs-base mb-1">Fill Colors</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="ri:star-fill" className="fs-3 text-primary" />
                <IconifyIcon icon="ri:user-fill" className="fs-3 text-secondary" />
                <IconifyIcon icon="ri:checkbox-circle-fill" className="fs-3 text-success" />
                <IconifyIcon icon="ri:notification-3-fill" className="fs-3 text-info" />
                <IconifyIcon icon="ri:alert-fill" className="fs-3 text-warning" />
                <IconifyIcon icon="ri:file-text-fill" className="fs-3 text-danger" />
                <IconifyIcon icon="ri:tv-fill" className="fs-3 text-light" />
                <IconifyIcon icon="ri:lock-fill" className="fs-3 text-dark" />
                <IconifyIcon icon="ri:database-2-fill" className="fs-3 text-purple" />
              </div>
            </CardBody>

            <CardBody className="border-top border-dashed">
              <h4 className="mt-0 fs-base mb-1">Sizes</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="ri:phone-line" className="fs-1" />
                <IconifyIcon icon="ri:coupon-2-line" className="fs-2" />
                <IconifyIcon icon="ri:macbook-line" className="fs-3" />
                <IconifyIcon icon="ri:tablet-line" className="fs-4" />
                <IconifyIcon icon="ri:gamepad-line" className="fs-5" />
                <IconifyIcon icon="ri:timer-line" className="fs-6" />
              </div>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="ri:timer-line" />
                <IconifyIcon icon="ri:timer-line" className="fs-sm" />
                <IconifyIcon icon="ri:timer-line" className="fs-lg" />
                <IconifyIcon icon="ri:timer-line" className="fs-xl" />
                <IconifyIcon icon="ri:timer-line" className="fs-xxl" />
                <IconifyIcon icon="ri:timer-line" className="fs-24" />
                <IconifyIcon icon="ri:timer-line" className="fs-32" />
                <IconifyIcon icon="ri:timer-line" className="fs-36" />
                <IconifyIcon icon="ri:timer-line" className="fs-42" />
                <IconifyIcon icon="ri:timer-line" className="fs-60" />
              </div>
            </CardBody>

            <CardBody className="border-top border-dashed">
              <h4 className="mt-0 mb-3">Icons</h4>

              <div className="d-flex flex-wrap align-items-center text-center gap-2">
                {remixIconData.map((item, idx) => <div className="avatar-xxl" key={idx}>
                    <span className="avatar-title flex-column gap-1 border border-dashed rounded-3 overflow-hidden text-truncate text-center p-1">
                      <IconifyIcon icon={`ri:${item.iconName}`} className="fs-xxl" />
                      <span className="fw-semibold d-block w-100 text-truncate">{item.name}</span>
                    </span>
                  </div>)}
              </div>

              <div className="text-center mt-3">
                <Link to="https://remixicon.com/" target="_blank" className="btn btn-danger">
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