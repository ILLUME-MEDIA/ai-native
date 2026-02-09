import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
import { Bubblechart, ComboBarLineChart, DoughnutChart, MultiPieChart, PieChart, PolarAreaChart, RadarChart, ScatterChart, StackedBarLineChart } from './components/OthersChart';
const Page = () => {
  return <>
      <PageBreadcrumb title="Other" subtitle="Charts" />
      <Row>
        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Bubble</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <Bubblechart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Combo Bar & Line</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <ComboBarLineChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Stacked Bar & Line</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <StackedBarLineChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Doughnut</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <DoughnutChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Multi Series Pie</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <MultiPieChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Pie</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <PieChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Polar Area</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <PolarAreaChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Radar</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <RadarChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Scatter</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <ScatterChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Page;