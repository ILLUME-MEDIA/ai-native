import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import PasswordMeters from './components/PasswordMeters';
const Page = () => {
  return <>
      <PageBreadcrumb title="Password Meter" subtitle="Plugins" />
      <PasswordMeters />
    </>;
};
export default Page;