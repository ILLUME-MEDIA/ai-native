import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Charts from './components/Charts';
const Page = () => {
  return <>
      <PageBreadcrumb title="Bar EChart" subtitle="Charts" />
      <Charts />
    </>;
};
export default Page;