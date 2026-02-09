import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Icon as IconifyIcon } from '@iconify/react';
import { Link } from 'react-router';
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
const boxIconData = [{
  iconName: 'bx:phone',
  name: 'Phone'
}, {
  iconName: 'bxs:balloon',
  name: 'Balloon'
}, {
  iconName: 'bx:headphone',
  name: 'Headphones'
}, {
  iconName: 'bx:camera',
  name: 'Camera'
}, {
  iconName: 'bx:microphone',
  name: 'Microphone'
}, {
  iconName: 'bx:game',
  name: 'Gamepad'
}, {
  iconName: 'bx:printer',
  name: 'Printer'
}, {
  iconName: 'bx:data',
  name: 'Database'
}, {
  iconName: 'bx:cloud',
  name: 'Cloud'
}, {
  iconName: 'bx:wifi',
  name: 'Wi-Fi'
}, {
  iconName: 'bx:lock-alt',
  name: 'Lock'
}, {
  iconName: 'bx:key',
  name: 'Key'
}, {
  iconName: 'bx:shield',
  name: 'Shield'
}, {
  iconName: 'bx:envelope',
  name: 'Mail'
}, {
  iconName: 'bx:user',
  name: 'User'
}, {
  iconName: 'bx:group',
  name: 'Users'
}, {
  iconName: 'bx:cart',
  name: 'Cart'
}, {
  iconName: 'bx:briefcase',
  name: 'Briefcase'
}, {
  iconName: 'bx:file',
  name: 'File'
}, {
  iconName: 'bx:book',
  name: 'Book'
}, {
  iconName: 'bx:search',
  name: 'Search'
}, {
  iconName: 'bx:bell',
  name: 'Notification'
}, {
  iconName: 'bx:cog',
  name: 'Settings'
}, {
  iconName: 'bx:calendar',
  name: 'Calendar'
}, {
  iconName: 'bx:flag',
  name: 'Flag'
}, {
  iconName: 'bx:music',
  name: 'Music'
}, {
  iconName: 'bx:film',
  name: 'Movie'
}, {
  iconName: 'bx:upload',
  name: 'Upload'
}, {
  iconName: 'bx:download',
  name: 'Download'
}, {
  iconName: 'bxl:facebook-circle',
  name: 'Facebook'
}, {
  iconName: 'bxl:twitter',
  name: 'Twitter'
}, {
  iconName: 'bxl:instagram',
  name: 'Instagram'
}, {
  iconName: 'bxl:linkedin-square',
  name: 'LinkedIn'
}, {
  iconName: 'bxl:github',
  name: 'GitHub'
}, {
  iconName: 'bxl:youtube',
  name: 'YouTube'
}, {
  iconName: 'bx:map',
  name: 'Location'
}, {
  iconName: 'bx:send',
  name: 'Send'
}, {
  iconName: 'bx:chat',
  name: 'Chat'
}, {
  iconName: 'bx:like',
  name: 'Like'
}, {
  iconName: 'bx:error',
  name: 'Warning'
}, {
  iconName: 'bx:check-double',
  name: 'Done'
}, {
  iconName: 'bx:child',
  name: 'Child'
}];
const Page = () => {
  return <>
      <PageBreadcrumb title="Boxicons" subtitle="Icons" />
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="d-block">
              <CardTitle as="h4" className="mb-1 d-flex align-items-center gap-2">
                Overview
              </CardTitle>
              <p className="mb-0 text-muted">Simple Open Source icons carefully crafted for designers & developers</p>
            </CardHeader>

            <CardBody>
              <h4 className="mt-0 fs-base mb-1">Usage</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="bx:camera" className="fs-3" />
                <IconifyIcon icon="bx:heart" className="fs-3" />
                <IconifyIcon icon="bx:star" className="fs-3" />
                <IconifyIcon icon="bx:check" className="fs-3" />
                <IconifyIcon icon="bx:bell" className="fs-3" />
                <IconifyIcon icon="bx:cloud" className="fs-3" />
                <IconifyIcon icon="bx:user" className="fs-3" />
              </div>
            </CardBody>

            <div className="card-body border-top border-dashed">
              <h4 className="mt-0 fs-base mb-1">Colors</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="bx:home" className="fs-3 text-primary" />
                <IconifyIcon icon="bx:cog" className="fs-3 text-secondary" />
                <IconifyIcon icon="bx:calendar" className="fs-3 text-success" />
                <IconifyIcon icon="bx:message" className="fs-3 text-info" />
                <IconifyIcon icon="bx:flag" className="fs-3 text-warning" />
                <IconifyIcon icon="bx:folder" className="fs-3 text-danger" />
                <IconifyIcon icon="bx:globe" className="fs-3 text-light" />
                <IconifyIcon icon="bx:key" className="fs-3 text-dark" />
                <IconifyIcon icon="bx:layer" className="fs-3 text-purple" />
              </div>
            </div>

            <div className="card-body border-top border-dashed">
              <h4 className="mt-0 fs-base mb-1">Solid Icons Style</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="bxs:star" className="fs-3 text-primary" />
                <IconifyIcon icon="bxs:user" className="fs-3 text-secondary" />
                <IconifyIcon icon="bxs:check-circle" className="fs-3 text-success" />
                <IconifyIcon icon="bxs:bell" className="fs-3 text-info" />
                <IconifyIcon icon="bxs:error-circle" className="fs-3 text-warning" />
                <IconifyIcon icon="bxs:file" className="fs-3 text-danger" />
                <IconifyIcon icon="bxs:tv" className="fs-3 text-light" />
                <IconifyIcon icon="bxs:lock" className="fs-3 text-dark" />
                <IconifyIcon icon="bxs:data" className="fs-3 text-purple" />
              </div>
            </div>

            <div className="card-body border-top border-dashed">
              <h4 className="mt-0 fs-base mb-1">Sizes</h4>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="bx:phone" className="fs-1" />
                <IconifyIcon icon="bx:purchase-tag" className="fs-2" />
                <IconifyIcon icon="bx:laptop" className="fs-3" />
                <IconifyIcon icon="bx:devices" className="fs-4" />
                <IconifyIcon icon="bx:game" className="fs-5" />
                <IconifyIcon icon="bx:timer" className="fs-6" />
              </div>

              <div className="d-flex align-items-center gap-2 mt-3">
                <IconifyIcon icon="bx:timer" />
                <IconifyIcon icon="bx:timer" className="fs-sm" />
                <IconifyIcon icon="bx:timer" className="fs-lg" />
                <IconifyIcon icon="bx:timer" className="fs-xl" />
                <IconifyIcon icon="bx:timer" className="fs-xxl" />
                <IconifyIcon icon="bx:timer" className="fs-24" />
                <IconifyIcon icon="bx:timer" className="fs-32" />
                <IconifyIcon icon="bx:timer" className="fs-36" />
                <IconifyIcon icon="bx:timer" className="fs-42" />
                <IconifyIcon icon="bx:timer" className="fs-60" />
              </div>
            </div>

            <CardBody className="border-top border-dashed">
              <h4 className="mt-0 mb-3">Icons</h4>

              <div className="d-flex flex-wrap align-items-center text-center gap-2">
                {boxIconData.map((item, idx) => <div className="avatar-xxl" key={idx}>
                    <span className="avatar-title flex-column gap-1 border border-dashed rounded-3 overflow-hidden text-truncate text-center p-1">
                      <IconifyIcon icon={item.iconName} className="fs-xxl" />
                      <span className="fw-semibold d-block w-100 text-truncate">{item.name}</span>
                    </span>
                  </div>)}
              </div>

              <div className="text-center mt-3">
                <Link to="https://v2.boxicons.com/" target="_blank" className="btn btn-danger">
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