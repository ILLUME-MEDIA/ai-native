import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
import { BasicLineChart, InterpolationChart, LineSegmentChart, MultiAxesChart, PointStylingChart, SteppedChart } from './components/LineChart';
const Page = () => {
  return <>
      <PageBreadcrumb title="Line Charts" subtitle="Charts" />
      <Row>
        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Basic Line</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <BasicLineChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Interpolation</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <InterpolationChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Multi-Axes</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <MultiAxesChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Point Styling</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <PointStylingChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Line Segment</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <LineSegmentChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Stepped</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <SteppedChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Page;