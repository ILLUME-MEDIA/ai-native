import ApexChart from '@admin/components/wrappers/ApexChart';
import Icon from '@admin/components/wrappers/Icon';
import { getColor } from '@admin/utils/helpers';
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
const getSimplePieChart = () => ({
  chart: {
    height: 243,
    type: 'donut'
  },
  legend: {
    show: false
  },
  stroke: {
    width: 0
  },
  plotOptions: {
    pie: {
      donut: {
        size: '75%',
        labels: {
          show: true,
          total: {
            showAlways: true,
            show: true
          }
        }
      }
    }
  },
  series: [112, 234, 88, 144],
  labels: ['Newsletter', 'Instagram', 'WhatsApp', 'Website'],
  colors: [getColor('chart-primary'), getColor('chart-secondary'), getColor('chart-alpha'), getColor('chart-gray')],
  dataLabels: {
    enabled: false
  },
  responsive: [{
    breakpoint: 480,
    options: {
      chart: {
        width: 200
      }
    }
  }]
});
const LeadSource = () => {
  return <>
      <Card className="card-h-100">
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">Lead Source</CardTitle>
          <div className="d-flex gap-1">
            <Button size="sm" className="btn-default">
              <Icon icon="cloud-upload" className="me-1" /> Export
            </Button>
            <Button size="sm" className="btn-light">
              <Icon icon="download" className="me-1" /> Import
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <ApexChart getOptions={getSimplePieChart} series={getSimplePieChart().series} type="donut" height={243} />
          <Row className="mt-2">
            <Col>
              <div className="d-flex justify-content-between align-items-center p-1">
                <div>
                  <Icon icon="speakerphone" className="fs-16 align-middle me-1 text-primary" />
                  <span className="align-middle fw-semibold">Newsletter</span>
                </div>
                <span className="fw-semibold text-muted float-end">
                  <Icon icon="chevron-up" className="text-success" /> 6.37%
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center p-1">
                <div>
                  <Icon icon="user-hexagon" className="fs-16 align-middle me-1 text-danger" />
                  <span className="align-middle fw-semibold">Instagram</span>
                </div>
                <span className="fw-semibold text-muted float-end">
                  <Icon icon="chevron-up" className="text-success" /> 34.8%
                </span>
              </div>
            </Col>
            <Col>
              <div className="d-flex justify-content-between align-items-center p-1">
                <div>
                  <Icon icon="settings-2" className="fs-16 align-middle me-1 text-success" />
                  <span className="align-middle fw-semibold">WhatsApp</span>
                </div>
                <span className="fw-semibold text-muted float-end">
                  <Icon icon="chevron-down" className="text-danger" /> 8.9%
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center p-1">
                <div>
                  <Icon icon="world" className="fs-16 align-middle me-1 text-warning" />
                  <span className="align-middle fw-semibold">Website</span>
                </div>
                <span className="fw-semibold text-muted float-end">
                  <Icon icon="chevron-up" className="text-success" />
                  44.3%
                </span>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </>;
};
export default LeadSource;