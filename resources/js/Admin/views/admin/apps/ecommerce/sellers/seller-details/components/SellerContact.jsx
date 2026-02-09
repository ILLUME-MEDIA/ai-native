import seller4 from '@admin/assets/images/sellers/1.png';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Card, CardBody, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
const SellerContact = () => {
  return <Card className="card-top-sticky">
      <CardBody>
        <div className="d-flex justify-content-between align-items-center rounded border-light p-2 bg-light-subtle border">
          <div className="d-flex justify-content-start align-items-center gap-3">
            <div className="avatar avatar-xl">
              <img src={seller4} alt="avatar-2" className="img-fluid rounded-circle" />
            </div>
            <div>
              <h5 className="text-nowrap fw-bold mb-1">MacHub Retailers</h5>
              <p className="text-muted mb-0">Since 2017</p>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Dropdown placement="bottom-end">
              <DropdownToggle variant="light" size="sm" className="btn-icon drop-arrow-none">
                <Icon icon="dots" className="fs-24" />
              </DropdownToggle>
              <DropdownMenu align="end">
                <DropdownItem href="#">Edit Profile</DropdownItem>
                <DropdownItem className="text-danger" href="#">
                  Report
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
        <div className="mt-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
              <Icon icon="user" className="fs-xl text-secondary" />
            </div>
            <p className="mb-0 fs-sm">
              Owner: <span className="fw-semibold"> Sophie Martinez</span>
            </p>
          </div>
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
              <Icon icon="briefcase" className="fs-xl text-secondary" />
            </div>
            <p className="mb-0 fs-sm">
              Business Type: <span className="fw-semibold">Fashion Retail</span>
            </p>
          </div>
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
              <Icon icon="calendar-event" className="fs-xl text-secondary" />
            </div>
            <p className="mb-0 fs-sm">
              Founded: <span className="fw-semibold">2015</span>
            </p>
          </div>
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
              <Icon icon="map-pin" className="fs-xl text-secondary" />
            </div>
            <p className="mb-0 fs-sm">
              Location: <span className="fw-semibold">Los Angeles, USA</span>
            </p>
          </div>
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
              <Icon icon="mail" className="fs-xl text-secondary" />
            </div>
            <p className="mb-0 fs-sm">
              Support:{' '}
              <a href="mailto:help@stylehub.com" className="text-primary fw-semibold">
                help@stylehub.com
              </a>
            </p>
          </div>
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="avatar-sm bg-light d-flex align-items-center justify-content-center rounded">
              <Icon icon="world" className="fs-xl text-secondary" />
            </div>
            <p className="mb-0 fs-sm">
              Website:{' '}
              <a href="www.stylehub.com" className="text-primary fw-semibold">
                www.stylehub.com
              </a>
            </p>
          </div>
        </div>
      </CardBody>
      <CardBody className="border-top border-dashed">
        <h5 className="mb-3">Contact Seller</h5>
        <form action="#">
          <div className="mb-3">
            <textarea className="form-control" id="exampleFormControlTextarea1" rows={4} placeholder="Enter your messages..." defaultValue="" />
          </div>
          <div className="text-end">
            <Button variant="primary" type="submit">
              Send Messages
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>;
};
export default SellerContact;