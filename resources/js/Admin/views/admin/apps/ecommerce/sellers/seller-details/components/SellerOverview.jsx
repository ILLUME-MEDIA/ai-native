import ApexChart from '@admin/components/wrappers/ApexChart';
import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap';
import { getSellerChartOptions } from './data';
const SellerOverview = () => {
  return <Card>
      <CardHeader>
        <CardTitle as="h4">Seller Overview</CardTitle>
      </CardHeader>
      <CardBody>
        <ApexChart getOptions={getSellerChartOptions} series={getSellerChartOptions().series} type="bar" height={370} />
      </CardBody>
    </Card>;
};
export default SellerOverview;