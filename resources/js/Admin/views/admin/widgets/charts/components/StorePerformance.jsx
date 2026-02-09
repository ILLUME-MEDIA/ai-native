import ApexChart from '@admin/components/wrappers/ApexChart';
import Icon from '@admin/components/wrappers/Icon';
import { getColor } from '@admin/utils/helpers';
import { Link } from 'react-router';
import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap';
export const getTotalUsersChart = () => ({
  chart: {
    height: 204,
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
  colors: [getColor('chart-primary'), getColor('chart-alpha'), getColor('chart-gray')],
  dataLabels: {
    enabled: false
  },
  responsive: [{
    breakpoint: 480,
    options: {
      chart: {
        width: 160
      }
    }
  }]
});
const StorePerformance = () => {
  return <>
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
          <ApexChart getOptions={getTotalUsersChart} series={getTotalUsersChart().series} type="donut" height={204} />
          <div className="text-center">
            <span className="badge badge-outline-light text-dark p-1 px-2 rounded-pill fs-12">
              <Icon icon="star-filled" className="text-success me-1" /> GOOD SALES
            </span>
          </div>
          <div className="table-responsive mt-3">
            <table className="table table-sm table-nowrap table-borderless table-centered mb-0">
              <thead className="bg-light bg-opacity-50 thead-sm">
                <tr className="text-uppercase fs-xxs">
                  <th>Page</th>
                  <th>Views</th>
                  <th>B. Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <a href="" className="text-muted">
                      /paces/dashboard-analytics
                    </a>
                  </td>
                  <td>25</td>
                  <td>87.5%</td>
                </tr>
                <tr>
                  <td>
                    <a href="" className="text-muted">
                      /paces/dashboard-crm
                    </a>
                  </td>
                  <td>15</td>
                  <td>21.48%</td>
                </tr>
                <tr>
                  <td>
                    <a href="" className="text-muted">
                      /paces/dashboard
                    </a>
                  </td>
                  <td>10</td>
                  <td>63.59%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </>;
};
export default StorePerformance;