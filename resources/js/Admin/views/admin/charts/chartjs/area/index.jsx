import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
import { AreaChartJs, BoundariesChart, DifferentDatasetChart, DrawTimeChart, StackedChart } from './components/AreaChart';
const Page = () => {
  return <>
      <PageBreadcrumb title="Area Charts" subtitle="Charts" />
      <Row>
        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Basic Area</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <AreaChartJs />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Different Dataset</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <DifferentDatasetChart />
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
              <CardTitle as="h4">Boundaries</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <BoundariesChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Draw Time</CardTitle>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <div className="mt-3">
                  <DrawTimeChart />
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Page;