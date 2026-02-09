import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import KanbanPage from './components/KanbanPage';
const Page = () => {
  return <>
      <PageBreadcrumb title="Kanban Board" subtitle="Projects" />

      <KanbanPage />
    </>;
};
export default Page;