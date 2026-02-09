import Icon from '@admin/components/wrappers/Icon';
import { SimpleBar } from '@admin/components/wrappers/SimpleBar';
import { Link } from 'react-router';
import { conversationData, mainMenuData, workspaceData } from './data';
const SideBar = () => {
  return <>
      <SimpleBar className="card-body p-0 outlook-left-menu-content">
        <div className="chat-sidebar p-3">
          <div className="mb-4">
            <div className="list-group list-group-flush list-custom">
              {mainMenuData.map((item, idx) => <Link key={idx} to={item.href} className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${item.active ? 'active' : ''}`}>
                  {item.icon && <Icon icon={item.icon} className="fs-md" />}
                  {item.label}
                </Link>)}
            </div>
          </div>

          <div className="mb-3">
            <h6 className="text-muted text-uppercase fs-xs mb-2">Workspaces</h6>
            <div className="list-group list-group-flush list-custom">
              {workspaceData.map((item, idx) => <Link key={idx} to={item.href} className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${item.active ? 'active' : ''}`}>
                  {item.icon && <Icon icon={item.icon} className="fs-md" />}
                  {item.label}
                </Link>)}
            </div>
          </div>

          <div>
            <h6 className="text-muted text-uppercase fs-xs mb-2">Recent Conversations</h6>
            <div className="list-group list-group-flush list-custom">
              {conversationData.map((item, idx) => <Link key={idx} to={item.href} className={`list-group-item list-group-item-action text-body py-1 ${item.active ? 'active' : ''}`}>
                  {item.label}
                </Link>)}
            </div>
          </div>
        </div>
      </SimpleBar>
    </>;
};
export default SideBar;