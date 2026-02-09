import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Row, Spinner } from 'react-bootstrap';
const Page = () => {
  return <>
      <PageBreadcrumb title="Spinners" subtitle="UI" />
      <Row>
        <Col xl={6}>
          <BorderSpinner />
          <ColorsSpinner />
          <AlignMent />
          <ButtonsSpinner />
        </Col>

        <Col xl={6}>
          <GrowingSpinner />
          <ColorGrowingSpinner />
          <Size />
        </Col>
      </Row>
    </>;
};
export default Page;
const BorderSpinner = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4">Border Spinner</CardTitle>
        </div>
      </CardHeader>

      <CardBody>
        <p className="text-muted">Use border spinners as lightweight loading indicators.</p>

        <Spinner className="m-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </CardBody>
    </Card>;
};
const ColorsSpinner = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4">Colors</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          Use text color utilities like <code>.text-primary</code>, <code>.text-success</code>, or <code>.text-danger</code> to style the spinner, which inherits its color from <code>currentColor</code>.
        </p>

        <div>
          <Spinner className="text-primary m-2" role="status" />
          <Spinner className="text-secondary m-2" role="status" />
          <Spinner className="text-success m-2" role="status" />
          <Spinner className="text-danger m-2" role="status" />
          <Spinner className="text-warning m-2" role="status" />
          <Spinner className="text-info m-2" role="status" />
          <Spinner className="text-light m-2" role="status" />
          <Spinner className="text-dark m-2" role="status" />
          <Spinner className="text-purple m-2" role="status" />
        </div>
      </CardBody>
    </Card>;
};
const AlignMent = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4">Alignment</CardTitle>
        </div>
      </CardHeader>

      <CardBody>
        <p className="text-muted">
          Bootstrap spinners use <code>rem</code>, <code>currentColor</code>, and <code>inline-flex</code> for easy sizing and alignment.
        </p>

        <div className="d-flex align-items-center">
          <strong>Loading...</strong>
          <Spinner className="ms-auto" role="status" aria-hidden="true" />
        </div>

        <div className="d-flex justify-content-center mt-3">
          <Spinner role="status" />
        </div>
      </CardBody>
    </Card>;
};
const ButtonsSpinner = () => {
  return <Card>
      <CardHeader>
        <CardTitle as="h4">Buttons Spinner</CardTitle>
      </CardHeader>

      <CardBody>
        <Row className="g-3">
          <Col lg={6}>
            <div className="d-flex flex-wrap gap-2">
              <Button variant="primary" className="btn-icon" type="button" disabled>
                <Spinner className="spinner-border-sm" role="status" aria-hidden="true" />
                <span className="visually-hidden">Loading...</span>
              </Button>
              <Button variant="primary" className="btn-icon rounded-circle" type="button" disabled>
                <Spinner className="spinner-border-sm" role="status" aria-hidden="true" />
                <span className="visually-hidden">Loading...</span>
              </Button>
              <Button variant="primary" type="button" disabled>
                <Spinner className="spinner-border-sm" role="status" aria-hidden="true" />
                <span className="visually-hidden">Loading...</span>
              </Button>
              <Button className="btn-primary" type="button" disabled>
                <Spinner className="spinner-border-sm me-2" role="status" aria-hidden="true" />
                Loading...
              </Button>
            </div>
          </Col>
          <Col lg={6}>
            <div className="d-flex flex-wrap gap-2">
              <Button variant="primary" className="btn-icon" type="button" disabled>
                <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true" />
                <span className="visually-hidden">Loading...</span>
              </Button>

              <Button variant="primary" className="btn-icon rounded-circle" type="button" disabled>
                <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true" />
                <span className="visually-hidden">Loading...</span>
              </Button>

              <Button variant="primary" type="button" disabled>
                <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true" />
                <span className="visually-hidden">Loading...</span>
              </Button>

              <Button variant="primary" type="button" disabled>
                <Spinner as="span" animation="grow" size="sm" role="status" aria-hidden="true" className="me-2" />
                Loading...
              </Button>
            </div>
          </Col>
        </Row>
      </CardBody>
    </Card>;
};
const GrowingSpinner = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4">Growing Spinner</CardTitle>
        </div>
      </CardHeader>

      <CardBody>
        <p className="text-muted">
          Bootstrap spinners use <code>rem</code>, <code>currentColor</code>, and <code>inline-flex</code> for easy resizing, coloring, and alignment.
        </p>

        <div className="spinner-grow m-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </CardBody>
    </Card>;
};
const ColorGrowingSpinner = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4">Color Growing Spinner</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          The grow spinner also uses <code>currentColor</code>, so apply classes like <code>.text-primary</code>, <code>.text-warning</code>, or <code>.text-info</code> to customize its color.
        </p>

        <div>
          <Spinner animation="grow" className="text-primary m-2" role="status" />
          <Spinner animation="grow" className="text-secondary m-2" role="status" />
          <Spinner animation="grow" className="text-success m-2" role="status" />
          <Spinner animation="grow" className="text-danger m-2" role="status" />
          <Spinner animation="grow" className="text-warning m-2" role="status" />
          <Spinner animation="grow" className="text-info m-2" role="status" />
          <Spinner animation="grow" className="text-light m-2" role="status" />
          <Spinner animation="grow" className="text-dark m-2" role="status" />
          <Spinner animation="grow" className="text-purple m-2" role="status" />
        </div>
      </CardBody>
    </Card>;
};
const Size = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4">Size</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <Row>
          <Col lg={6}>
            <Spinner animation="border" className="avatar-lg text-primary m-2" role="status" />
            <Spinner animation="grow" className="avatar-lg text-secondary m-2" role="status" />
          </Col>
          <Col lg={6}>
            <Spinner animation="border" className="avatar-md text-primary m-2" role="status" />
            <Spinner animation="grow" className="avatar-md text-secondary m-2" role="status" />
          </Col>
          <Col lg={6}>
            <Spinner animation="border" className="avatar-sm text-primary m-2" role="status" />
            <Spinner animation="grow" className="avatar-sm text-secondary m-2" role="status" />
          </Col>
          <Col lg={6}>
            <Spinner animation="border" size="sm" className="m-2" role="status" />
            <Spinner animation="grow" size="sm" className="m-2" role="status" />
          </Col>
        </Row>
      </CardBody>
    </Card>;
};