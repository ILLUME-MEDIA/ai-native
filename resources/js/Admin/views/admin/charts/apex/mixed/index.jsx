import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Card, CardBody, CardHeader, Col, Row } from 'react-bootstrap';
import { AllMixedChart, LineAreaChart, LineColumnMixed, MultipleYaxisMixed } from './components/MixedChart';
const Page = () => {
  return <>
      <PageBreadcrumb title="Mixed Apexchart" subtitle="Charts" />
      <Row>
        <Col xl={6}>
          <Card>
            <CardHeader>
              <h4 className="card-title">Line & Column Chart</h4>
            </CardHeader>

            <CardBody>
              <div dir="ltr">
                <LineColumnMixed />
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={6}>
          <Card>
            <CardHeader>
              <h4 className="card-title">Multiple Y-Axis Chart</h4>
            </CardHeader>

            <CardBody>
              <div dir="ltr">
                <MultipleYaxisMixed />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={6}>
          <Card>
            <CardHeader>
              <h4 className="card-title">Line & Area Chart</h4>
            </CardHeader>
            <CardBody>
              <div dir="ltr">
                <LineAreaChart />
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardHeader>
              <h4 className="card-title">Line, Column & Area Chart</h4>
            </CardHeader>

            <CardBody>
              <div dir="ltr">
                <AllMixedChart />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Page;