import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Card, CardBody, CardHeader, CardTitle, Col, Nav, Row } from 'react-bootstrap';
const Page = () => {
  return <>
      <PageBreadcrumb title="Breadcrumb" subtitle="UI" />
      <Row>
        <Col xl={6}>
          <Basic />
        </Col>
        <Col xl={6}>
          <WithIcon />
        </Col>
      </Row>
    </>;
};
export default Page;
const Basic = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4">Basic</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <Nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0 py-2">
            <li className="breadcrumb-item active" aria-current="page">
              Home
            </li>
          </ol>
        </Nav>

        <Nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0 py-2">
            <li className="breadcrumb-item">
              <Link to="#">Home</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Library
            </li>
          </ol>
        </Nav>

        <Nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0 py-2">
            <li className="breadcrumb-item">
              <Link to="#">Home</Link>
            </li>
            <li className="breadcrumb-item">
              <Link to="#">Library</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Data
            </li>
          </ol>
        </Nav>
      </CardBody>
    </Card>;
};
const WithIcon = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4">With Icons</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <Nav aria-label="breadcrumb">
          <ol className="breadcrumb bg-light bg-opacity-50 p-2 mb-2">
            <li className="breadcrumb-item active" aria-current="page">
              <Icon icon="smart-home" className="me-1" />
              Home
            </li>
          </ol>
        </Nav>

        <Nav aria-label="breadcrumb">
          <ol className="breadcrumb bg-light bg-opacity-50 p-2 mb-2">
            <li className="breadcrumb-item">
              <Link to="">
                <Icon icon="smart-home" />
                Home
              </Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Library
            </li>
          </ol>
        </Nav>

        <Nav aria-label="breadcrumb">
          <ol className="breadcrumb bg-light bg-opacity-50 p-2 mb-0">
            <li className="breadcrumb-item">
              <Link to="">
                <Icon icon="smart-home" />
                Home
              </Link>
            </li>
            <li className="breadcrumb-item">
              <a href="#">Library</a>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Data
            </li>
          </ol>
        </Nav>
      </CardBody>
    </Card>;
};