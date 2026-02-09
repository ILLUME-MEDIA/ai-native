import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Card } from 'react-bootstrap';
import OutlookRightPanel from './components/OutlookRightPanel';
import SideBar from './components/SideBar';
const Page = () => {
  return <>
      <PageBreadcrumb title="Pro AI" subtitle="Apps" />

      <div className="outlook-box gap-1">
        <div className="offcanvas-lg offcanvas-start outlook-left-menu rounded-start-4" tabIndex={-1} id="outlookSidebaroffcanvas" aria-labelledby="outlookSidebaroffcanvasLabel">
          <Card className="rounded-0 mb-0">
            <SideBar />
          </Card>
        </div>
        <OutlookRightPanel />
      </div>
    </>;
};
export default Page;