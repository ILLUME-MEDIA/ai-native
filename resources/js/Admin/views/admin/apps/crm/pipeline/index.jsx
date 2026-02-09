import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import PipelinePage from './components/PipelinePage';
const Page = () => {
  return <>
      <PageBreadcrumb title="Pipeline" subtitle="CRM" />
      <PipelinePage />
    </>;
};
export default Page;