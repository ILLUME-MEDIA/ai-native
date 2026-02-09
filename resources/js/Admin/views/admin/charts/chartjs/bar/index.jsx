import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
import { BasicBarChart, BorderReducedBarChart, FloatingChart, HorizontalChart, StackedChart, StackedwithGroupsChart, VerticalChart } from './components/BarChart';
const Page = () => {
  return <>
      <PageBreadcrumb title="Bar Charts" subtitle="Charts" />
      <Row>
        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Basic Bar</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <BasicBarChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Border Radius</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <BorderReducedBarChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Floating</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <FloatingChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Horizontal</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <HorizontalChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Stacked</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <StackedChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Stacked with Groups</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <StackedwithGroupsChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Vertical</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <VerticalChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Page;