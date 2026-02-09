import ApexChart from '@admin/components/wrappers/ApexChart';
import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import { getColor } from '@admin/utils/helpers';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
const categories = [];
for (let i = 1; i <= 15; i++) {
  categories.push(i + 'D');
}
function getRandomOrders(length) {
  const d = [];
  for (let idx = 0; idx < length; idx++) {
    d.push(Math.floor(Math.random() * 90) + 30);
  }
  return d;
}
function getRefundsFromOrders(orders) {
  return orders.map(v => {
    const percent = (Math.random() * (15 - 5) + 5) / 100;
    return Math.round(v * percent);
  });
}
const ordersData = getRandomOrders(15);
const refundsData = getRefundsFromOrders(ordersData);
const getTotalOrderChart = () => ({
  chart: {
    height: 263,
    type: 'bar',
    stacked: true,
    toolbar: {
      show: false
    }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '35%'
    }
  },
  series: [{
    name: 'Orders',
    data: ordersData
  }, {
    name: 'Refunds',
    data: refundsData
  }],
  dataLabels: {
    enabled: false
  },
  markers: {
    size: 0
    // style: 'hollow',
  },
  colors: [getColor('chart-primary'), getColor('chart-alpha')],
  fill: {
    type: 'gradient',
    gradient: {
      inverseColors: true,
      shade: 'light',
      type: 'vertical',
      opacityFrom: 0.75,
      opacityTo: 1,
      stops: [0, 25, 50, 100]
    }
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: function (val) {
        return val.toString();
      }
    }
  },
  xaxis: {
    categories: categories,
    tickAmount: 6,
    labels: {
      rotate: 0,
      formatter: function (val) {
        return val + '';
      },
      style: {
        fontSize: '11px'
      }
    },
    tickPlacement: 'on'
  },
  legend: {
    offsetY: 15
  },
  grid: {
    borderColor: getColor('chart-order-color'),
    padding: {
      top: -10,
      right: 0,
      bottom: -10,
      left: 10
    }
  }
});
const TotalOrder = () => {
  return <>
      <Card className="card-h-100">
        <CardBody>
          <div className="d-flex justify-content-between align-items-start flex-wrap">
            <div>
              <h4 className="fs-13 mb-2 fw-bold text-uppercase text-muted">Total Orders</h4>
              <div className="d-flex align-items-center gap-2 mb-2 py-1">
                <div className="avatar-md flex-shrink-0">
                  <span className="avatar-title text-bg-success rounded-circle">
                    <Icon icon="basket" className="fs-xxl" />
                  </span>
                </div>
                <h3 className="mb-0">
                  <CountUp end={659.8} prefix="$" start={0} duration={10} suffix="k" decimal="." decimals={2} />
                </h3>
                <span className="badge fs-13 ms-auto badge-soft-danger">
                  <Icon icon="arrow-down" /> 3.21%
                </span>
              </div>
            </div>

            <div className="app-search app-search-sm">
              <select className="form-select form-control form-select-sm">
                <option value="All">All Time</option>
                <option value="today">Today</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_90_days">Last 90 Days</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
              </select>
              <Icon icon="calendar" className="app-search-icon text-muted" />
            </div>
          </div>
          <Row className="align-items-center">
            <Col xs="12">
              <ApexChart getOptions={getTotalOrderChart} series={getTotalOrderChart().series} type="bar" height={258} />
            </Col>
          </Row>
        </CardBody>
      </Card>
    </>;
};
export default TotalOrder;