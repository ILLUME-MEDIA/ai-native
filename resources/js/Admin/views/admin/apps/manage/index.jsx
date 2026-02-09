import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import clsx from 'clsx';
import { Link } from 'react-router';
import { Button, Card, CardBody, CardTitle, Col, OverlayTrigger, ProgressBar, Row, Tooltip } from 'react-bootstrap';
import FormCheckInput from 'react-bootstrap/esm/FormCheckInput';
import { authorizedAppData, integrationData } from './data';
const Page = () => {
  return <>
      <PageBreadcrumb title="Manage Apps" subtitle="Apps" />

      <Row>
        <Col xs={12}>
          <h5 className="mb-1 fs-lg">Authorized Apps</h5>
          <p className="text-muted">
            You’re currently using&nbsp;
            <strong>3 of 3</strong>&nbsp; free integrations. Upgrade to&nbsp;
            <a href="#" className="text-decoration-underline">
              PRO
            </a>
            &nbsp; to unlock more integrations and supercharge your workflow.
          </p>
        </Col>
      </Row>
      <Row>
        {authorizedAppData.map((app, idx) => <Col md={4} key={idx}>
            <AuthorizedAppCard app={app} />
          </Col>)}
      </Row>
      <Row className="my-2">
        <Col xs={12} className="text-center">
          <h5 className="mb-1 fs-lg">Explore More Integrations</h5>
          <p className="text-muted mb-3">Discover over 200 integrations to enhance your workflow</p>
        </Col>
      </Row>
      <Row>
        {integrationData.map((item, idx) => <Col md={4} key={idx}>
            <IntegrationCard integration={item} />
          </Col>)}
        <Col xs={12} className="mb-3">
          <nav>
            <ul className="pagination pagination-boxed pagination-rounded justify-content-center">
              <li className="page-item">
                <Link className="page-link" to="" aria-label="Previous">
                  <Icon icon="chevron-left" className="align-middle fs-lg" />
                </Link>
              </li>
              <li className="page-item">
                <Link className="page-link" to="">
                  1
                </Link>
              </li>
              <li className="page-item active">
                <Link className="page-link" to="">
                  2
                </Link>
              </li>
              <li className="page-item">
                <Link className="page-link" to="">
                  3
                </Link>
              </li>
              <li className="page-item">
                <Link className="page-link" to="">
                  4
                </Link>
              </li>
              <li className="page-item">
                <Link className="page-link" to="">
                  5
                </Link>
              </li>
              <li className="page-item">
                <Link className="page-link" to="" aria-label="Next">
                  <Icon icon="chevron-right" className="align-middle fs-lg" />
                </Link>
              </li>
            </ul>
          </nav>
        </Col>
      </Row>
    </>;
};
export default Page;
const AuthorizedAppCard = ({
  app
}) => {
  const {
    name,
    description,
    image,
    usagePercent,
    plan,
    syncTime,
    account,
    isActive,
    status,
    lastSync
  } = app;
  return <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="d-flex align-items-center gap-3">
            <img src={image} alt={`${name} Logo`} width={48} height={48} className="rounded" />
            <div>
              <CardTitle as="h4" className="mb-1">
                {name}
              </CardTitle>
              <p className="text-muted mb-0">{description}</p>
            </div>
          </div>

          <div className="form-check form-switch">
            <FormCheckInput className="form-check-input" type="checkbox" defaultChecked={isActive} readOnly />
          </div>
        </div>

        <div className="mb-3 d-flex flex-wrap gap-2">
          <span className="badge bg-light text-primary px-2 py-1 rounded-pill">{plan}</span>
          <span className="badge bg-success-subtle text-success px-2 py-1 rounded-pill">{status}</span>
          <span className="badge bg-info-subtle text-info px-2 py-1 rounded-pill">Sync: {syncTime}</span>
        </div>

        <Row className="mb-3">
          <Col md={6}>
            <p className="fs-xxs text-uppercase fw-bold mb-0 text-muted">Connected Account</p>
            <span>{account}</span>
          </Col>
          <Col md={6}>
            <p className="fs-xxs text-uppercase fw-bold mb-0 text-muted">Last Sync</p>
            <span>{lastSync}</span>
          </Col>
        </Row>

        <div className="mb-3">
          <div className="d-flex justify-content-between">
            <span className="mb-2 fw-bold fs-xs">Usage</span>
            <small className="fw-bold text-success">{usagePercent}% of quota</small>
          </div>
          <ProgressBar variant="success" now={usagePercent} style={{
          height: 6
        }} />
        </div>

        <div className="d-flex gap-2">
          <Button variant="outline-danger" className="w-50">
            Remove
          </Button>
          <OverlayTrigger overlay={<Tooltip>View integration details</Tooltip>}>
            <Button variant="outline-primary" className="w-50">
              Details
            </Button>
          </OverlayTrigger>
        </div>
      </CardBody>
    </Card>;
};
const IntegrationCard = ({
  integration
}) => {
  const {
    name,
    description,
    image,
    isFree,
    website
  } = integration;
  return <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="avatar-xl d-block mb-1">
            <span className="avatar-title bg-light bg-opacity-75 rounded">
              <img src={image} alt={name} height={30} />
            </span>
          </span>
          <span className={clsx('badge badge-label', isFree ? 'text-bg-light' : 'text-bg-warning')}>
            {!isFree && <Icon icon="medal" />} {isFree ? 'Free' : 'Premium'}
          </span>
        </div>
        <CardTitle as="h4" className="mb-1">
          {name}
        </CardTitle>
        <p className="card-text text-muted">{description}</p>
        <div className="mb-3 d-flex align-items-center gap-1">
          <Icon icon="world" />
          <Link to="" className="link-reset">
            {website}
          </Link>
        </div>
        <div className="d-flex gap-2">
          <Button variant="success" className="w-50">
            Connect
          </Button>
          <OverlayTrigger overlay={<Tooltip>View integration details</Tooltip>}>
            <button className="btn btn-outline-secondary w-50">
              Learn More
              <Icon icon="arrow-right" className="ms-1" />
            </button>
          </OverlayTrigger>
        </div>
      </CardBody>
    </Card>;
};