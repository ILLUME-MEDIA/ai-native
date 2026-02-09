import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import ProductsPage from './components/ProductsPage';
const Page = () => {
  return <>
      <PageBreadcrumb title="Products Grid" subtitle="Ecommerce" />

      <ProductsPage />
    </>;
};
export default Page;