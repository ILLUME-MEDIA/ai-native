import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Button, Card, CardBody, CardHeader, CardTitle, Col, ProgressBar, Row } from 'react-bootstrap';
const Page = () => {
  return <>
      <PageBreadcrumb title="Progress" subtitle="UI" />
      <Row>
        <Col xs={12}></Col>
        <Col xl={6}>
          <Example />
          <HeightProgressBar />
          <MultipleBars />
          <AnimatedStripes />
        </Col>
        <Col xl={6}>
          <LabelsBar />
          <BackgroundBar />
          <StripedBar />
          <StepsProgressBar />
        </Col>
      </Row>
    </>;
};
export default Page;
const Example = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            Examples
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">A progress bar can be used to show a user how far along he/she is in a process.</p>
        <ProgressBar className="mb-2" now={0} />
        <ProgressBar className="mb-2" now={25} />
        <ProgressBar className="mb-2" now={50} />
        <ProgressBar className="mb-2" now={75} />
        <ProgressBar className="progress" now={100} />
      </CardBody>
    </Card>;
};
const HeightProgressBar = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            Height
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          We only set a <code>height</code> value on the <code>.progress</code>, so if you change that value the inner <code>.progress-bar</code> will automatically resize accordingly. Use <code>.progress-sm</code>,<code>.progress-md</code>,<code>.progress-lg</code>,
          <code>.progress-xl</code>
          classes.
        </p>
        <ProgressBar now={25} variant="danger" className="mb-2" style={{
        height: 1
      }} />
        <ProgressBar now={25} variant="primary" className="mb-2" style={{
        height: 3
      }} />
        <ProgressBar now={25} variant="success" className="mb-2 progress-sm" />
        <ProgressBar now={50} variant="info" className="mb-2 progress-md" />
        <ProgressBar now={75} variant="warning" className="progress-lg mb-2" />
        <ProgressBar now={38} variant="success" className="progress-xl" />
      </CardBody>
    </Card>;
};
const MultipleBars = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            Multiple bars
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">Include multiple progress bars in a progress component if you need.</p>
        <ProgressBar className="progress">
          <ProgressBar now={15}></ProgressBar>
          <ProgressBar now={30} variant="success" className="bg-success" />
          <ProgressBar now={20} variant="info" className="bg-info" />
        </ProgressBar>
      </CardBody>
    </Card>;
};
const AnimatedStripes = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            Animated stripes
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          The striped gradient can also be animated. Add
          <code>.progress-bar-animated</code> to <code>.progress-bar</code> to animate the stripes right to left via CSS3 animations.
        </p>
        <ProgressBar now={75} animated className="progress" />
      </CardBody>
    </Card>;
};
const LabelsBar = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            Labels
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          Add labels to your progress bars by placing text within the
          <code>.progress-bar</code>.
        </p>
        <ProgressBar now={25} className="mb-3" label="25%" />
        <ProgressBar now={10} className="text-dark overflow-visible" label="Long label text for the progress bar, set to a dark color" />
      </CardBody>
    </Card>;
};
const BackgroundBar = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4">Backgrounds</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">Use background utility classes to change the appearance of individual progress bars.</p>
        <ProgressBar now={25} variant="success" className="mb-2" />
        <ProgressBar now={50} variant="info" className="mb-2" />
        <ProgressBar now={75} variant="warning" className="mb-2" />
        <ProgressBar now={100} variant="danger" className="mb-2" />
        <ProgressBar now={65} variant="dark" className="mb-2" />
        <ProgressBar now={50} variant="secondary" />
      </CardBody>
    </Card>;
};
const StripedBar = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            Striped
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          Add <code>.progress-bar-striped</code> to any
          <code>.progress-bar</code> to apply a stripe via CSS gradient over the progress bar&apos;s background color.
        </p>
        <ProgressBar now={10} striped className="mb-2" />
        <ProgressBar now={25} striped variant="success" className="mb-2" />
        <ProgressBar now={50} striped variant="info" className="mb-2" />
        <ProgressBar now={75} striped variant="warning" className="mb-2" />
        <ProgressBar now={100} striped variant="danger" className="mb-2" />
      </CardBody>
    </Card>;
};
const StepsProgressBar = () => {
  return <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4" className="card-title">
            Steps
          </CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <div className="position-relative m-4">
          <ProgressBar now={50} style={{
          height: 2
        }} className="bg-light" />
          <Button variant="primary" className="position-absolute top-0 start-0 translate-middle btn-icon rounded-pill">
            1
          </Button>
          <Button variant="primary" className="position-absolute top-0 start-50 translate-middle btn-icon rounded-pill">
            2
          </Button>
          <Button variant="light" className="position-absolute top-0 start-100 translate-middle btn-icon rounded-pill">
            3
          </Button>
        </div>
      </CardBody>
    </Card>;
};