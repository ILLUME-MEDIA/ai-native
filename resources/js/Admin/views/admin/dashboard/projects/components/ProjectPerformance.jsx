import ApexChart from '@admin/components/wrappers/ApexChart';
import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import { getColor } from '@admin/utils/helpers';
import { Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
import { performanceData } from './data';
const getSalesReportChart = () => ({
  series: [{
    name: 'Project Revenue',
    type: 'area',
    data: [30, 35, 40, 45, 50, 58, 62, 68, 72, 78, 80, 70] // Jan–Dec
  }, {
    name: 'Project Orders',
    type: 'line',
    data: [20, 24, 28, 30, 33, 35, 38, 40, 42, 45, 48, 50] // Jan–Dec
  }, {
    name: 'Project Users',
    type: 'bar',
    data: [15, 18, 22, 25, 28, 30, 35, 38, 40, 45, 48, 50] // Jan–Dec
  }, {
    name: 'Active Projects Count',
    type: 'bar',
    data: [10, 12, 15, 18, 20, 24, 26, 28, 30, 35, 38, 40] // Jan–Dec
  }],
  chart: {
    type: 'line',
    height: 321,
    toolbar: {
      show: false
    },
    offsetX: 0
  },
  stroke: {
    width: [2, 2, 0, 0],
    curve: 'smooth',
    dashArray: [0, 3, 0, 0]
  },
  colors: [getColor('chart-gray'), getColor('chart-gamma'), getColor('chart-primary'), getColor('chart-zeta')],
  grid: {
    strokeDashArray: 1
  },
  xaxis: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    type: 'category',
    axisBorder: {
      show: false
    },
    labels: {
      offsetY: 1
    }
  },
  yaxis: {
    min: 0,
    labels: {
      formatter: function (val) {
        return val + 'k';
      },
      offsetX: -10
    },
    axisBorder: {
      show: false
    }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '50%',
      borderRadius: 3
    }
  },
  legend: {
    show: false
  },
  dataLabels: {
    enabled: false
  },
  markers: {
    size: 0
  },
  fill: {
    opacity: [0.2, 1, 1, 1]
  },
  tooltip: {
    y: {
      formatter: function (value) {
        return '$' + value + 'k';
      }
    }
  }
});
const ProjectPerformance = () => {
  return <>
      <Card className="card-h-100">
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">Projects Performance Overview</CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="chart-line" className="me-2" /> View Detailed Report
              </DropdownItem>
              <DropdownItem>
                <Icon icon="filter-2" className="me-2" /> Filter by Project
              </DropdownItem>
              <DropdownItem>
                <Icon icon="calendar" className="me-2" /> Select Date Range
              </DropdownItem>
              <DropdownItem>
                <Icon icon="download" className="me-2" /> Export as CSV
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem className="text-danger" href="#">
                <Icon icon="refresh" className="me-2" /> Reset Analytics
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody>
          <Row className="text-center g-2">
            {performanceData.map((item, idx) => <Col key={idx}>
                <div className="border bg-light-subtle border-dashed border-light p-2 rounded">
                  <h4>
                    <CountUp end={item.value} start={0} duration={5} prefix={item.prefix} suffix={item.suffix} decimals={2} />
                  </h4>
                  <p className="mb-0 text-muted">{item.title}</p>
                </div>
              </Col>)}
          </Row>
          <ApexChart getOptions={getSalesReportChart} series={getSalesReportChart().series} type="line" height={321} />
        </CardBody>
      </Card>
    </>;
};
export default ProjectPerformance;