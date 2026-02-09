import ApexChart from '@admin/components/wrappers/ApexChart';
import Icon from '@admin/components/wrappers/Icon';
import { getColor } from '@admin/utils/helpers';
import { Link } from 'react-router';
import { Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
export const getTotalUsersChart = () => ({
  chart: {
    height: 218,
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
            show: true,
            formatter: function (w) {
              return w.globals.seriesTotals.reduce((a, b) => {
                return a + b;
              }, 0) + 'k';
            }
          }
        }
      }
    }
  },
  series: [44, 55, 41],
  labels: ['Direct', 'Affiliate', 'Sponsored'],
  colors: [getColor('chart-primary'), getColor('chart-gamma'), getColor('chart-gray')],
  dataLabels: {
    enabled: false
  },
  responsive: [{
    breakpoint: 480,
    options: {
      chart: {
        width: 180
      }
    }
  }]
});
export const getWeeklyPerformanceChart = () => ({
  series: [{
    data: [{
      x: 'Mon',
      y: [28, 45]
    }, {
      x: 'Tue',
      y: [32, 41]
    }, {
      x: 'Wed',
      y: [29, 78]
    }, {
      x: 'Thu',
      y: [30, 46]
    }, {
      x: 'Fri',
      y: [35, 41]
    }, {
      x: 'Sat',
      y: [45, 65]
    }, {
      x: 'Sun',
      y: [41, 56]
    }]
  }],
  chart: {
    height: 255,
    type: 'rangeBar',
    toolbar: {
      show: false
    },
    zoom: {
      enabled: false
    }
  },
  plotOptions: {
    bar: {
      horizontal: true,
      isDumbbell: true,
      dumbbellColors: [[getColor('chart-primary'), getColor('chart-primary')]]
    }
  },
  legend: {
    show: false
  },
  fill: {
    type: 'gradient',
    gradient: {
      gradientToColors: [getColor('chart-primary'), getColor('chart-gamma'), getColor('chart-gray')],
      inverseColors: false,
      stops: [0, 100]
    }
  },
  xaxis: {
    // type: 'string',
    axisBorder: {
      show: false
    }
  },
  yaxis: {
    axisBorder: {
      show: false
    },
    labels: {
      offsetX: 10
    }
  },
  grid: {
    borderColor: getColor('chart-order-color'),
    padding: {
      top: -20,
      right: 0,
      bottom: -10,
      left: 0
    }
  }
});
const StorePerformance = () => {
  return <>
      <Row className="h-100">
        <Col lg="6">
          <Card className="card-h-100">
            <CardHeader className="justify-content-between">
              <CardTitle as="h4">Store Performance Analytics</CardTitle>
              <div>
                <Link to="" className="btn btn-sm btn-default">
                  <Icon icon="refresh" className="me-1" /> Refresh
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              <ApexChart getOptions={getTotalUsersChart} series={getTotalUsersChart().series} type="donut" height={215} />
              <div className="text-center mb-1">
                <span className="badge badge-outline-light text-dark p-1 px-2 rounded-pill fs-12">
                  <Icon icon="star-filled" className="text-danger me-1" /> POOR SALES
                </span>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg="6">
          <Card className="card-h-100">
            <CardHeader className="justify-content-between">
              <CardTitle as="h4">Weekly Performance Insights</CardTitle>
              <Dropdown className="ms-auto">
                <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
                  <Icon icon="dots-vertical" className="fs-lg" />
                </DropdownToggle>
                <DropdownMenu align="end">
                  <DropdownItem>
                    <Icon icon="refresh" className="me-2" /> Refresh Data
                  </DropdownItem>
                  <DropdownItem>
                    <Icon icon="download" className="me-2" /> Download Report
                  </DropdownItem>
                  <DropdownItem>
                    <Icon icon="share" className="me-2" /> Share Insights
                  </DropdownItem>
                  <DropdownDivider />
                  <DropdownItem className="text-danger">
                    <Icon icon="archive" className="me-2" /> Archive Widget
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </CardHeader>
            <CardBody>
              <ApexChart getOptions={getWeeklyPerformanceChart} series={getWeeklyPerformanceChart().series} type="rangeBar" height={255} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default StorePerformance;