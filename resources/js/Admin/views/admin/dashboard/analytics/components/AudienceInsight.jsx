import ApexChart from '@admin/components/wrappers/ApexChart';
import Icon from '@admin/components/wrappers/Icon';
import { getColor } from '@admin/utils/helpers';
import { Button, Card, CardBody, CardHeader, CardTitle, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import { insightData } from './data';
const getTotalUsersChart = () => ({
  chart: {
    height: 160,
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
  labels: ['Organic', 'Referral', 'Paid'],
  colors: [getColor('chart-primary'), getColor('chart-zeta'), getColor('chart-alpha')],
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
const AudienceInsight = () => {
  return <>
      <Card className='card-h-100'>
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">Audience Insights</CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="chart-bar" className="me-2" /> View Detailed Report
              </DropdownItem>
              <DropdownItem>
                <Icon icon="download" className="me-2" /> Export Analytics
              </DropdownItem>
              <DropdownItem>
                <Icon icon="filter-2" className="me-2" /> Apply Filters
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem className="text-danger">
                <Icon icon="trash" className="me-2" /> Remove Widget
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody className="p-0">
          <div className="row g-0">
            <div className="col">
              <div className="border-bottom p-2 border-end border-dashed">
                <h3 className="mb-0 d-flex gap-2 align-items-center justify-content-center">
                  <Icon icon="users" />
                  <span id="active-users-count">125</span>
                </h3>
              </div>
            </div>
            <div className="col">
              <div className="border-bottom p-2 border-dashed">
                <h3 className="mb-0 d-flex gap-2 align-items-center justify-content-center">
                  <Icon icon="pos" />
                  <span id="active-views-count">125</span>
                </h3>
              </div>
            </div>
          </div>
        </CardBody>
        <CardBody>
          <ApexChart getOptions={getTotalUsersChart} series={getTotalUsersChart().series} type="donut" height={160} />
          <div className="table-responsive mt-2">
            <table className="table table-sm table-nowrap table-borderless table-centered mb-0">
              <thead className="bg-light bg-opacity-50 thead-sm">
                <tr className="text-uppercase fs-xxs">
                  <th>Page</th>
                  <th>Views</th>
                  <th>B. Rate</th>
                </tr>
              </thead>
              <tbody>
                {insightData.map((item, idx) => <tr key={idx}>
                    <td>
                      <a href="" className="text-muted">
                        {item.pageLink}
                      </a>
                    </td>
                    <td>{item.views}</td>
                    <td>{item.rate}%</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          <div className="text-center mt-2">
            <Button size="sm" variant="secondary">
              View All <Icon icon="arrow-right" className="ms-1" />
            </Button>
          </div>
        </CardBody>
      </Card>
    </>;
};
export default AudienceInsight;