import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import ChatPage from './components/ChatPage';
const Page = () => {
  return <>
      <PageBreadcrumb title="Chat" subtitle="Apps" />
      <ChatPage />
    </>;
};
export default Page;