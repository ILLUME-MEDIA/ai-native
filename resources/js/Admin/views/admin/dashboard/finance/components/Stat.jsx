import ApexChart from '@admin/components/wrappers/ApexChart';
import { CountUp } from '@admin/components/wrappers/CountUp';
import { Icon as IconifyIcon } from '@iconify/react';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { financeStatData } from './data';
const Stat = () => {
  return <>
      <Row>
        {financeStatData.map((item, idx) => {
        const options = item.chartOptions();
        return <Col xl="3" md="6" key={idx}>
              <Card>
                <CardBody>
                  <IconifyIcon icon={item.icon} className={`fs-36 ${item.className}`} />
                  <h3 className="fw-bold mt-3 mb-1">
                    <CountUp end={item.value} start={0} duration={10} prefix="$" suffix="k" decimals={2} decimal="." />
                  </h3>
                  <p className="text-muted">{item.title}</p>
                  <span className={`badge fs-12 ${item.change > 6 ? 'badge-soft-success' : 'badge-soft-danger'}`}>
                    {item.change > 6 ? <IconifyIcon icon="tabler:arrow-badge-up" /> : <IconifyIcon icon="tabler:arrow-badge-down" />}
                    {item.change}%
                  </span>
                  <ApexChart className="mt-3" getOptions={() => options} series={options.series} height={51} />
                </CardBody>
              </Card>
            </Col>;
      })}
      </Row>
    </>;
};
export default Stat;