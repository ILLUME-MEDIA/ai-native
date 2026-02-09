import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import CreateArticle from './components/CreateArticle';
const Page = () => {
  return <>
      <PageBreadcrumb title="Add Article" subtitle="Blog" />
      <CreateArticle />
    </>;
};
export default Page;