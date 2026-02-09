import ApexChart from '@admin/components/wrappers/ApexChart';
import Icon from '@admin/components/wrappers/Icon';
import { getColor } from '@admin/utils/helpers';
import { Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
const getSalesReportChart = () => ({
  chart: {
    height: 341,
    type: 'radialBar'
  },
  plotOptions: {
    radialBar: {
      track: {
        margin: 22,
        background: 'rgba(170,184,197, 0.2)'
      },
      hollow: {
        size: '1%'
      },
      dataLabels: {
        name: {
          show: true
        },
        value: {
          show: true
        }
      }
    }
  },
  stroke: {
    lineCap: 'round'
  },
  colors: [getColor('chart-primary'), getColor('chart-gamma'), getColor('chart-secondary'), getColor('chart-beta')],
  series: [44, 55, 67, 22],
  labels: ['Completed', 'In Progress', 'Yet to Start', 'Cancelled'],
  responsive: [{
    breakpoint: 380,
    options: {
      chart: {
        height: 260
      }
    }
  }]
});
const ProjectStatus = () => {
  return <>
      <Card className="card-h-100">
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">Project Status Breakdown</CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="eye" className="me-2" /> View All Status Details
              </DropdownItem>
              <DropdownItem>
                <Icon icon="filter-2" className="me-2" /> Filter by Status
              </DropdownItem>
              <DropdownItem>
                <Icon icon="calendar" className="me-2" /> Change Date Range
              </DropdownItem>
              <DropdownItem>
                <Icon icon="download" className="me-2" /> Export Breakdown
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem className="text-danger" href="#">
                <Icon icon="refresh" className="me-2" /> Reset Status View
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody className="pt-0">
          <ApexChart getOptions={getSalesReportChart} series={getSalesReportChart().series} type="radialBar" height={341} />
          <Row className="mt-2">
            <Col>
              <div className="d-flex justify-content-between align-items-center p-1">
                <div>
                  <Icon icon="circle-filled" className="fs-12 align-middle me-1 text-secondary" />
                  <span className="align-middle fw-semibold">Completed</span>
                </div>
                <span className="fw-semibold text-muted float-end">
                  <Icon icon="chevron-down" className="text-danger" /> 965
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center p-1">
                <div>
                  <Icon icon="circle-filled" className="fs-12 align-middle me-1 text-warning" />
                  <span className="align-middle fw-semibold">In Progress</span>
                </div>
                <span className="fw-semibold text-muted float-end">
                  <Icon icon="chevron-up" className="text-success" /> 75
                </span>
              </div>
            </Col>
            <Col>
              <div className="d-flex justify-content-between align-items-center p-1">
                <div>
                  <Icon icon="circle-filled" className="fs-12 align-middle me-1 text-secondary" />
                  <span className="align-middle fw-semibold"> Yet to Start</span>
                </div>
                <span className="fw-semibold text-muted float-end">
                  <Icon icon="chevron-up" className="text-success" /> 102
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center p-1">
                <div>
                  <Icon icon="circle-filled" className="fs-12 align-middle me-1 text-danger" />
                  <span className="align-middle fw-semibold">Cancelled</span>
                </div>
                <span className="fw-semibold text-muted float-end">
                  <Icon icon="chevron-down" className="text-danger" /> 96
                </span>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </>;
};
export default ProjectStatus;