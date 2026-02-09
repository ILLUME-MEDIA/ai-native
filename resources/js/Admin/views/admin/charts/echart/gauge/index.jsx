import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Gauges from './components/Gauges';
const Page = () => {
  return <>
      <PageBreadcrumb title="Gauge EChart" subtitle="Charts" />
      <Gauges />
    </>;
};
export default Page;