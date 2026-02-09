import Icon from '@admin/components/wrappers/Icon';
import { toPascalCase } from '@admin/utils/helpers';
import clsx from 'clsx';
import { Badge, Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, ProgressBar, Row } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
const TeamCard = ({
  team
}) => {
  return <Card className="card-h-100">
      <CardHeader>
        <CardTitle as="h4" className="d-inline">
          {team.name}
          <Badge bg={team.status === 'busy' ? 'danger' : team.status === 'ongoing' ? 'warning' : team.status === 'stable' ? 'secondary' : team.status === 'new' ? 'primary' : 'success'} className={clsx('ms-2  badge-label')}>
            {toPascalCase(team.status)}
          </Badge>
        </CardTitle>
        <Dropdown className="ms-auto">
          <DropdownToggle as="a" className="text-muted fs-xl drop-arrow-none" style={{
          cursor: 'pointer'
        }}>
            <Icon icon="dots-vertical" />
          </DropdownToggle>
          <DropdownMenu align="end">
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
      </CardHeader>
      <CardBody className="d-flex flex-column justify-content-between">
        <Row className="g-3">
          <Col md={6}>
            <p className="mb-2 text-muted">Total {team.members.length} members</p>
            <div className="avatar-group avatar-group-sm mb-3">
              {team.members.slice(0, 5).map((member, idx) => <div className="avatar" key={idx}>
                  <img src={member.image} alt="" className="rounded-circle avatar-sm" />
                </div>)}
              {team.members.length > 5 && <div className="avatar avatar-sm">
                  <span className="avatar-title text-bg-primary rounded-circle fw-bold">{team.members.length - 5}+</span>
                </div>}
            </div>
          </Col>
          <Col md={6}>
            <div className="d-flex gap-2">
              <div className="avatar-sm flex-shrink-0">
                <span className="avatar-title text-bg-light rounded-circle">
                  <Icon icon="medal" className="fs-lg" />
                </span>
              </div>
              <div>
                <h6 className="mb-1 text-muted text-uppercase">Ranking</h6>
                <p className="fw-medium mb-0">#{team.rank}</p>
              </div>
            </div>
          </Col>
        </Row>
        <div className="mb-3">
          <p className="text-muted">{team.description}</p>
        </div>

        <div className="mb-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <p className="mb-0 text-muted fw-medium">{team.progress.label}</p>
            <p className="fw-semibold mb-0">{team.progress.value}%</p>
          </div>
          <ProgressBar now={team.progress.value} variant="primary" className="progress-sm" />
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <span className="text-muted fs-xs">
            <Icon icon="clock" className="me-1" />
            Updated {team.updatedTime}
          </span>
          <Button size="sm" className="rounded-pill" variant="primary">
            Details
          </Button>
        </div>
      </CardBody>
    </Card>;
};
export default TeamCard;