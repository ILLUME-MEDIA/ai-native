import authImg from '@admin/assets/images/auth-card-bg.svg';
import Icon from '@admin/components/wrappers/Icon';
import { Fragment } from 'react';
import { Card, CardBody, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, OverlayTrigger, Tooltip } from 'react-bootstrap';
const MemberRoleCard = ({
  member
}) => {
  const {
    icon,
    title,
    users,
    features,
    description,
    time
  } = member;
  return <Card>
      <div className="position-absolute top-0 end-0" style={{
      width: 180
    }}>
        <img src={authImg} alt="auth-card-bg" className="auth-card-bg-img" />
      </div>
      <CardBody className="d-flex flex-column justify-content-between">
        <div className="d-flex mb-4">
          <div className="flex-shrink-0">
            <div className="avatar-xl rounded bg-primary-subtle d-flex align-items-center justify-content-center">
              <Icon icon={icon} className="fs-24 text-primary" />
            </div>
          </div>
          <div className="ms-3">
            <h5 className="mb-1">{title}</h5>
            <p className="text-muted mb-0 fs-base">{description}</p>
          </div>
          <div className="ms-auto">
            <Dropdown align="end">
              <DropdownToggle as="a" href="#" className="text-muted fs-xl drop-arrow-none">
                <Icon icon="dots-vertical" />
              </DropdownToggle>

              <DropdownMenu>
                <DropdownItem href="">
                  <Icon icon="eye" className="me-2" />
                  View
                </DropdownItem>
                <DropdownItem href="">
                  <Icon icon="edit" className="me-2" />
                  Edit
                </DropdownItem>
                <DropdownItem href="" className="text-danger">
                  <Icon icon="trash" className="me-2" />
                  Remove
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
        <ul className="list-unstyled mb-3">
          {features.map((feature, idx) => <li className={`d-flex align-items-center ${idx !== features.length - 1 ? 'mb-2' : ''}`} key={idx}>
              <Icon icon="check" className="fs-lg text-success me-2" /> {feature}
            </li>)}
        </ul>
        <p className="mb-2 text-muted">Total {users.length} users</p>
        <div className="avatar-group avatar-group-sm mb-3">
          {users.map((user, idx) => <Fragment key={idx}>
              {idx < 4 && <div className="avatar">
                  <img src={user.image} className="rounded-circle avatar-sm" alt={`user-${idx + 1}`} />
                </div>}
            </Fragment>)}
          {users.length > 4 && <OverlayTrigger overlay={<Tooltip>{users.length - 4} More</Tooltip>}>
              <div className="avatar avatar-sm">
                <span className="avatar-title text-bg-primary rounded-circle fw-bold"> +{users.length - 4}</span>
              </div>
            </OverlayTrigger>}
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <span className="text-muted fs-xs">
            <Icon icon="clock" className="me-1" />
            Updated {time}
          </span>
          <a href="#" className="btn btn-sm btn-outline-primary rounded-pill">
            Details
          </a>
        </div>
      </CardBody>
    </Card>;
};
export default MemberRoleCard;