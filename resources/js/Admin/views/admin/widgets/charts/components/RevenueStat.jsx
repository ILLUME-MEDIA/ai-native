import ApexChart from '@admin/components/wrappers/ApexChart';
import { CountUp } from '@admin/components/wrappers/CountUp';
import clsx from 'clsx';
import { revenueStatisticData } from './data';
import { Card, CardBody, CardHeader, Col } from 'react-bootstrap';
const RevenueStat = () => {
  return <>
      {revenueStatisticData.map((item, index) => {
      const isReverse = item.title === 'Total Expenses' || item.title === 'Cash Flow';
      return <Col key={index}>
            <Card>
              <CardHeader className="d-flex border-0 justify-content-between align-items-center">
                <h5 className="card-title mb-0">{item.title}</h5>
                <span className={clsx('badge', item.className)}>{item.change}</span>
              </CardHeader>

              <CardBody>
                <div className={clsx('d-flex justify-content-between align-items-center', isReverse && 'flex-row-reverse')}>
                  <div className={clsx(isReverse && 'text-end ms-3')}>
                    <h3 className="mb-1 fw-normal">
                      <CountUp start={0} end={item.value} suffix={item.suffix} prefix={item.prefix} />
                    </h3>
                    <p className="mb-0 text-muted">{item.label}</p>
                  </div>

                  <div className="text-end w-50">
                    {item.chartOptions && <ApexChart type={item.chartOptions().chart?.type} height={60} getOptions={item.chartOptions} series={item.chartOptions().series} />}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>;
    })}
    </>;
};
export default RevenueStat;