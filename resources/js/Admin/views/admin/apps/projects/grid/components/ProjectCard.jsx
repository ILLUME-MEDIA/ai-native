import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import clsx from 'clsx';
import { Link } from 'react-router';
import { Card, CardBody, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, ProgressBar, Row } from 'react-bootstrap';
const ProjectCard = ({
  project
}) => {
  const {
    comments,
    dueDate,
    icon,
    progress,
    members,
    status,
    task,
    title,
    updatedTime,
    iconClassName,
    files
  } = project;
  return <Card>
      <CardBody className="d-flex flex-column">
        <div className="d-flex align-items-start border-bottom border-dashed pb-3 mb-3">
          <div className="avatar-xl me-3">
            <span className={clsx('avatar-title rounded', iconClassName)}>
              <Icon icon={icon} className="fs-24" />
            </span>
          </div>

          <div className="flex-grow-1">
            <div className="d-flex align-items-start gap-2">
              <h5 className="mb-1 lh-sm flex-grow-1">
                <Link to="/apps/projects/details" className="link-reset">
                  {title}
                </Link>
              </h5>
              <span className={clsx('badge fs-xxs badge-label align-self-start', status === 'delayed' ? 'badge-soft-danger' : status === 'pending' ? 'badge-soft-warning' : 'badge-soft-success')}>{toPascalCase(status)}</span>
            </div>
            <p className="text-muted fs-xxs mb-0">Updated {updatedTime}</p>
          </div>

          <div className="ms-2">
            <Dropdown>
              <DropdownToggle className="btn btn-icon btn-ghost-light text-muted drop-arrow-none">
                <Icon icon="dots-vertical" className="fs-xl" />
              </DropdownToggle>
              <DropdownMenu className="dropdown-menu-end">
                <li>
                  <DropdownItem href="">
                    <Icon icon="share" className="me-2" />
                    Share
                  </DropdownItem>
                </li>
                <li>
                  <DropdownItem href="">
                    <Icon icon="edit" className="me-2" />
                    Edit
                  </DropdownItem>
                </li>
                <li>
                  <DropdownItem href="">
                    <Icon icon="ban" className="me-2" />
                    Block
                  </DropdownItem>
                </li>
                <li>
                  <DropdownItem className="text-danger" href="">
                    <Icon icon="trash" className="me-2" />
                    Delete
                  </DropdownItem>
                </li>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        <Row className="g-3 mb-3">
          <Col xs="6">
            <div className="d-flex align-items-center gap-2">
              <Icon icon="list-check" className="text-muted fs-lg"></Icon>
              <div>
                <div className="fw-medium">
                  {' '}
                  {task.completed}/{task.total}
                </div>
                <small className="text-muted fs-xs">{task.label}</small>
              </div>
            </div>
          </Col>
          <Col xs="6">
            <div className="d-flex align-items-center gap-2">
              <Icon icon="paperclip" className="text-muted fs-lg" />
              <div>
                <div className="fw-medium">
                  {files.count} {files.type ? files.type : 'Files'}
                </div>
                <small className="text-muted fs-xs">{files.description}</small>
              </div>
            </div>
          </Col>
          <Col xs="6">
            <div className="d-flex align-items-center gap-2">
              <Icon icon="message" className="text-muted fs-lg" />
              <div>
                <div className="fw-medium">{comments.count} Comments</div>
                <small className="text-muted fs-xs">{comments.description}</small>
              </div>
            </div>
          </Col>
          <Col xs="6">
            <div className="d-flex align-items-center gap-2">
              <Icon icon="calendar-clock" className="text-muted fs-lg" />
              <div>
                <div className="fw-medium">{dueDate.date}</div>
                <small className="text-muted fs-xs">{dueDate.description}</small>
              </div>
            </div>
          </Col>
        </Row>
        <div className="mb-3">
          <p className="my-2 text-muted fw-semibold fs-xs">Team Members:</p>
          <div className="avatar-group avatar-group-xs">
            {members.map((member, idx) => <div className="avatar" key={idx}>
                <img src={member.image} alt={`Team member ${idx + 1}`} className="rounded-circle avatar-xs" />
              </div>)}
          </div>
        </div>

        <div className="mt-auto">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <p className="mb-0 text-muted fw-semibold fs-xs">Progress</p>
            <p className="fw-semibold mb-0">{progress}%</p>
          </div>
          <ProgressBar variant={status === 'delayed' ? 'danger' : status === 'pending' ? 'warning' : 'success'} now={progress} style={{
          height: '5px'
        }} />
        </div>
      </CardBody>
    </Card>;
};
export default ProjectCard;