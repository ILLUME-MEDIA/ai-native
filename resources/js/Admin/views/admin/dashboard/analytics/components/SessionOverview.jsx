import ApexChart from '@admin/components/wrappers/ApexChart';
import { CountUp } from '@admin/components/wrappers/CountUp';
import Icon from '@admin/components/wrappers/Icon';
import { getColor } from '@admin/utils/helpers';
import { Link } from 'react-router';
import { Card, CardBody, CardHeader, CardTitle, Nav, NavItem, NavLink, TabContainer, TabContent, TabPane } from 'react-bootstrap';
export const getFinancialOverviewChart = () => ({
  series: [{
    name: 'Visitors',
    data: [16, 19, 19, 16, 16, 14, 15, 15, 17, 17, 19, 19, 18, 18, 20, 20, 18, 18, 22, 22, 20, 20, 18, 18, 20, 20, 18, 20, 20, 22]
  }, {
    name: 'Page Views',
    data: [21, 24, 24, 21, 21, 19, 20, 20, 22, 22, 24, 24, 23, 23, 25, 25, 23, 23, 27, 27, 25, 25, 23, 23, 25, 25, 23, 25, 25, 27]
  }],
  chart: {
    type: 'area',
    height: 328,
    toolbar: {
      show: false
    },
    offsetX: 0
  },
  stroke: {
    width: [2, 2],
    dashArray: [0, 5]
  },
  colors: [getColor('chart-primary'), getColor('chart-gamma'), getColor('chart-gray')],
  grid: {
    strokeDashArray: 7
  },
  // zoom: {
  //   enabled: false,
  // },
  xaxis: {
    // type: 'string',
    axisBorder: {
      show: false
    },
    labels: {
      offsetY: 2
    }
  },
  yaxis: {
    tickAmount: 3,
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
  legend: {
    show: false
  },
  dataLabels: {
    enabled: false
  },
  markers: {
    size: 0
  },
  tooltip: {
    x: {
      format: 'dd MMM yyyy'
    }
  },
  fill: {
    opacity: [0.5, 0.5],
    type: ['gradient', 'gradient'],
    gradient: {
      type: 'vertical',
      //   shadeIntensity: 1,
      inverseColors: false,
      opacityFrom: 0.35,
      opacityTo: 0,
      stops: [0, 95]
    }
  }
});
const SessionOverview = () => {
  return <>
      <Card className="card-h-100">
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">
            Sessions Overview <span className="text-muted fs-base fw-normal">(609.5k Sessions)</span>
          </CardTitle>
          <div>
            <Link to="" className="btn btn-sm btn-default">
              <Icon icon="cloud-upload" className="me-1" /> Export
            </Link>
            &nbsp;
            <Link to="" className="btn btn-sm btn-light">
              <Icon icon="download" className="me-1" /> Import
            </Link>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <TabContainer defaultActiveKey="users-tab">
            <Nav className="nav-tabs nav-justified nav-bordered">
              <NavItem className="text-start">
                <NavLink eventKey="users-tab" href="" className="py-3 active gap-2 d-flex align-items-center justify-content-center">
                  <span className="avatar-md flex-shrink-0 d-none d-xxl-block">
                    <span className="avatar-title bg-info-subtle text-info rounded-circle">
                      <Icon icon="users" className="fs-xxl" />
                    </span>
                  </span>
                  <span>
                    <span className="text-muted">Users</span>
                    <p className="fs-xl mb-0 text-dark fw-semibold">
                      <CountUp start={0} end={39.03} duration={10} suffix="k" />
                      <span className="text-success fs-sm ms-2">
                        <Icon icon="arrow-up" />
                        3.02%
                      </span>
                    </p>
                  </span>
                </NavLink>
              </NavItem>
              <NavItem className="text-start">
                <NavLink eventKey="sessions-tab" href="" className="py-3 gap-2 d-flex align-items-center justify-content-center">
                  <span className="avatar-md flex-shrink-0 d-none d-xxl-block">
                    <span className="avatar-title bg-info-subtle text-info rounded-circle">
                      <Icon icon="eye" className="fs-xxl" />
                    </span>
                  </span>
                  <span>
                    <span className="text-muted">Sessions</span>
                    <p className="fs-xl mb-0 text-dark fw-semibold">
                      <CountUp start={0} end={42.15} duration={10} suffix="k" />
                      <span className="text-danger fs-sm ms-2">
                        <Icon icon="arrow-down" />
                        4.78%
                      </span>
                    </p>
                  </span>
                </NavLink>
              </NavItem>
              <NavItem className="text-start">
                <NavLink eventKey="bounce-rate-tab" href="" className="nav-link py-3 gap-2 d-flex align-items-center justify-content-center">
                  <span className="avatar-md flex-shrink-0 d-none d-xxl-block">
                    <span className="avatar-title bg-info-subtle text-info rounded-circle">
                      <Icon icon="trending-up" className="fs-xxl" />
                    </span>
                  </span>
                  <span>
                    <span className="text-muted">Bounce Rate</span>
                    <p className="fs-xl mb-0 text-dark fw-semibold">
                      <CountUp start={0} end={21.2} duration={10} suffix="%" />
                      <span className="text-danger fs-sm ms-2">
                        <Icon icon="arrow-down" />
                        31.39%
                      </span>
                    </p>
                  </span>
                </NavLink>
              </NavItem>
              <NavItem className="text-start">
                <NavLink eventKey="session-duration-tab" href="" className="py-3 gap-2 d-flex align-items-center justify-content-center">
                  <span className="avatar-md flex-shrink-0 d-none d-xxl-block">
                    <span className="avatar-title bg-info-subtle text-info rounded-circle">
                      <Icon icon="clock" className="fs-xxl" />
                    </span>
                  </span>
                  <span>
                    <span className="text-muted">Session Duration</span>
                    <p className="fs-xl mb-0 text-dark fw-semibold">
                      3m 12s
                      <span className="text-success fs-sm ms-2">
                        <Icon icon="arrow-up" />
                        7.92%
                      </span>
                    </p>
                  </span>
                </NavLink>
              </NavItem>
            </Nav>
            <TabContent className="p-3">
              <TabPane eventKey="users-tab" id="users-tab">
                <ApexChart getOptions={getFinancialOverviewChart} series={getFinancialOverviewChart().series} type="area" height={328} />
              </TabPane>
              <TabPane eventKey="sessions-tab" id="sessions-tab">
                <p className="mb-0">
                  <span className="px-1 rounded me-1 fw-semibold d-inline-block bg-danger-subtle text-danger float-start">P</span> "Hi there! I'm a
                  passionate individual who loves to explore new ideas and connect with like-minded people. My interests span a wide range of topics
                  including technology, literature, travel, and fitness. I believe in the power of continuous learning and enjoy challenging myself to
                  grow both personally and professionally.
                </p>
              </TabPane>
              <TabPane eventKey="bounce-rate-tab" id="bounce-rate-tab">
                <p className="mb-0">
                  <span className="px-1 rounded me-1 fw-semibold d-inline-block bg-secondary-subtle text-secondary float-start">S</span>In the heart
                  of a bustling city lies a quaint little cafe, nestled between towering skyscrapers and historic buildings. Its cozy interior boasts
                  warm, earthy tones accented with splashes of vibrant colors, creating a welcoming atmosphere that beckons passersby to step inside.
                </p>
              </TabPane>
              <TabPane eventKey="session-duration-tab" id="session-duration-tab">
                <p className="mb-0">
                  <span className="px-1 rounded me-1 fw-semibold d-inline-block bg-secondary-subtle text-secondary float-start">DD</span>In the heart
                  of a bustling city lies a quaint little cafe, nestled between towering skyscrapers and historic buildings. Its cozy interior boasts
                  warm, earthy tones accented with splashes of vibrant colors, creating a welcoming atmosphere that beckons passersby to step inside.
                </p>
              </TabPane>
            </TabContent>
          </TabContainer>
        </CardBody>
      </Card>
    </>;
};
export default SessionOverview;