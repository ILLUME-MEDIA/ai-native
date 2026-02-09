import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Card, CardBody, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import { userData } from './data';
const TeamMember = () => {
  return <>
      {userData.map((item, idx) => <Col md="6" xxl="3" key={idx}>
          <Card className="card-h-100">
            <CardBody>
              <div className="d-flex align-items-center mb-4">
                <div className="me-3 position-relative">
                  <img src={item.user.image} alt="avatar" className="rounded-circle" width={72} height={72} />
                  <span className={`position-absolute bottom-0 end-0 badge ${item.className} rounded-circle p-1 shadow-sm`} title="Rating 4.8">
                    <Icon icon="star" className="text-white" />
                  </span>
                </div>
                <div>
                  <h5 className="mb-1 d-flex align-items-center">
                    <Link to="" className="link-reset">
                      {item.user.name}
                    </Link>
                    <img src={item.image} alt="UK" className="ms-2 rounded-circle" height={16} />
                  </h5>
                  <p className="text-muted mb-1">{item.user.role}</p>
                  <span className="badge text-bg-light badge-label">{item.position}</span>
                </div>
                <div className="ms-auto">
                  <Dropdown>
                    <DropdownToggle className="btn btn-icon btn-ghost-light text-muted content-none">
                      <Icon icon="dots-vertical" className="fs-xl" />
                    </DropdownToggle>
                    <DropdownMenu align="end">
                      <DropdownItem>
                        <Icon icon="share" className="me-2" />
                        Share
                      </DropdownItem>
                      <DropdownItem>
                        <Icon icon="edit" className="me-2" />
                        Edit
                      </DropdownItem>
                      <DropdownItem>
                        <Icon icon="ban" className="me-2" />
                        Block
                      </DropdownItem>
                      <DropdownItem className="text-danger">
                        <Icon icon="trash" className="me-2" />
                        Delete
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </div>
              <ul className="list-unstyled text-muted mb-4">
                <li className="mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <div className="avatar-xs avatar-img-size fs-24">
                      <span className="avatar-title text-bg-light fs-sm rounded-circle">
                        <Icon icon="mail" />
                      </span>
                    </div>
                    <h5 className="fs-base mb-0 fw-medium">
                      <Link to="" className="link-reset">
                        {item.email}
                      </Link>
                    </h5>
                  </div>
                </li>
                <li className="mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <div className="avatar-xs avatar-img-size fs-24">
                      <span className="avatar-title text-bg-light fs-sm rounded-circle">
                        <Icon icon="phone" />
                      </span>
                    </div>
                    <h5 className="fs-base mb-0 fw-medium">
                      <Link to="" className="link-reset">
                        {item.phone}
                      </Link>
                    </h5>
                  </div>
                </li>
                <li className="mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <div className="avatar-xs avatar-img-size fs-24">
                      <span className="avatar-title text-bg-light fs-sm rounded-circle">
                        <Icon icon="map-pin" />
                      </span>
                    </div>
                    <h5 className="fs-base mb-0 fw-medium">{item.location}</h5>
                  </div>
                </li>
                <li>
                  <div className="d-flex align-items-center gap-2">
                    <div className="avatar-xs avatar-img-size fs-24">
                      <span className="avatar-title text-bg-light fs-sm rounded-circle">
                        <Icon icon="link" />
                      </span>
                    </div>
                    <h5 className="fs-base mb-0 fw-medium">
                      <Link to="">{item.website}</Link>
                    </h5>
                  </div>
                </li>
              </ul>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted fs-xs">
                  <Icon icon="refresh" className="me-1" />
                  {item.updatedText}
                </span>
                <Link to="" className="btn btn-soft-primary btn-sm rounded-pill">
                  View Profile
                </Link>
              </div>
            </CardBody>
          </Card>
        </Col>)}
    </>;
};
export default TeamMember;