import ApexChart from '@admin/components/wrappers/ApexChart';
import { CountUp } from '@admin/components/wrappers/CountUp';
import { getColor } from '@admin/utils/helpers';
import { Icon as IconifyIcon } from '@iconify/react';
import { Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
import { overviewData } from './data';
const getFinancialOverviewChart = () => ({
  series: [{
    name: 'Total Income',
    type: 'bar',
    data: [89.25, 98.58, 68.74, 108.87, 77.54, 84.03, 51.24, 28.57, 92.57, 42.36, 88.51, 36.57]
  }, {
    name: 'Total Expenses',
    type: 'bar',
    data: [22.25, 24.58, 36.74, 22.87, 19.54, 25.03, 29.24, 10.57, 24.57, 35.36, 20.51, 17.57]
  }, {
    name: 'Investments',
    type: 'area',
    data: [34, 65, 46, 68, 49, 61, 42, 44, 78, 52, 63, 67]
  }, {
    name: 'Savings',
    type: 'line',
    data: [8, 12, 7, 17, 21, 11, 5, 9, 7, 29, 12, 35]
  }],
  chart: {
    height: 348,
    type: 'line',
    toolbar: {
      show: false
    }
  },
  stroke: {
    dashArray: [0, 0, 0, 8],
    width: [0, 0, 2, 2],
    curve: 'smooth'
  },
  fill: {
    opacity: [1, 1, 0.1, 1],
    type: ['gradient', 'solid', 'solid', 'solid'],
    gradient: {
      type: 'vertical',
      //   shadeIntensity: 1,
      inverseColors: false,
      opacityFrom: 0.5,
      opacityTo: 0,
      stops: [0, 70]
    }
  },
  markers: {
    size: [0, 0, 0, 0],
    strokeWidth: 2,
    hover: {
      size: 4
    }
  },
  xaxis: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    axisTicks: {
      show: false
    },
    axisBorder: {
      show: false
    }
  },
  yaxis: {
    min: 0,
    labels: {
      formatter: function (val) {
        return val + 'k';
      }
    },
    axisBorder: {
      show: false
    }
  },
  grid: {
    show: true,
    xaxis: {
      lines: {
        show: false
      }
    },
    yaxis: {
      lines: {
        show: true
      }
    },
    padding: {
      top: 0,
      right: -2,
      bottom: 15,
      left: 10
    }
  },
  legend: {
    show: true,
    horizontalAlign: 'center',
    offsetX: 0,
    offsetY: -5,
    markers: {
      // width: 9,
      // height: 9,
      // radius: 6,
    },
    itemMargin: {
      horizontal: 10,
      vertical: 0
    }
  },
  plotOptions: {
    bar: {
      columnWidth: '50%',
      barHeight: '70%',
      borderRadius: 3
    }
  },
  colors: [getColor('chart-primary'), getColor('chart-gamma'), getColor('chart-gray'), getColor('chart-secondary')],
  tooltip: {
    shared: true,
    y: [{
      formatter: function (y) {
        if (typeof y !== 'undefined') {
          return '$' + y.toFixed(2) + 'k';
        }
        return y;
      }
    }, {
      formatter: function (y) {
        if (typeof y !== 'undefined') {
          return '$' + y.toFixed(2) + 'k';
        }
        return y;
      }
    }, {
      formatter: function (y) {
        if (typeof y !== 'undefined') {
          return '$' + y.toFixed(2) + 'k';
        }
        return y;
      }
    }, {
      formatter: function (y) {
        if (typeof y !== 'undefined') {
          return '$' + y.toFixed(2) + 'k';
        }
        return y;
      }
    }]
  }
});
const FinancialOverview = () => {
  return <>
      <Card className="card-h-100">
        <CardHeader className="border-0 justify-content-between">
          <CardTitle as="h4">Financial Overview</CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <IconifyIcon icon="tabler:dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <IconifyIcon icon="tabler:refresh" className="me-2" /> Refresh Data
              </DropdownItem>
              <DropdownItem>
                <IconifyIcon icon="tabler:chart-bar" className="me-2" /> View Analytics
              </DropdownItem>
              <DropdownItem>
                <IconifyIcon icon="tabler:filter-2" className="me-2" /> Filter Report
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem className="text-danger">
                <IconifyIcon icon="tabler:download" className="me-2" /> Export Data
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody className="p-0">
          <div className="bg-light bg-opacity-40">
            <Row className="text-center">
              {overviewData.map((item, idx) => <Col key={idx}>
                  <p className="text-muted mt-3 mb-1">{item.title}</p>
                  <h4 className="mb-3">
                    <IconifyIcon icon={item.icon} className={`${item.className} me-1`} />
                    <span>
                      <CountUp start={0} end={item.value} duration={5} prefix={item.prefix} suffix={item.suffix} decimals={2} decimal="." />
                    </span>
                  </h4>
                </Col>)}
            </Row>
          </div>
          <div className="p-2">
            <ApexChart getOptions={getFinancialOverviewChart} series={getFinancialOverviewChart().series} type="line" height={348} />
          </div>
        </CardBody>
      </Card>
    </>;
};
export default FinancialOverview;