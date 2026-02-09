import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import LayoutInfo from '../LayoutInfo';
import LayoutSwitcher from '../LayoutSwitcher';
const Page = () => {
  return <>
      <PageBreadcrumb title="Scrollable" subtitle="Layouts" />
      <LayoutSwitcher attribute="position" value="scrollable" />
      <LayoutInfo option="position" value="scrollable" />
    </>;
};
export default Page;