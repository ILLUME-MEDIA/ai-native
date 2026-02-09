import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Emails from './components/Emails';
const Page = () => {
  return <>
      <PageBreadcrumb title="Email" subtitle="Apps" />
      <div className="outlook-box gap-1 email-app ">
        <Emails />
      </div>
    </>;
};
export default Page;