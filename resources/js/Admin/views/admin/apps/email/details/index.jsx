import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import EmailDetails from './components/EmailDetails';
const Page = () => {
  return <>
      <PageBreadcrumb title="Email Details" subtitle="Apps" />
      <div className="outlook-box gap-1 email-app">
        <EmailDetails />
      </div>
    </>;
};
export default Page;