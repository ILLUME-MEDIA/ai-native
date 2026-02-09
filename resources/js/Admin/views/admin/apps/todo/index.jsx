import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Todos from './components/Todos';
const Page = () => {
  return <>
      <PageBreadcrumb title="Todo" subtitle="Apps" />
      <Todos />
    </>;
};
export default Page;