import Icon from '@admin/components/wrappers/Icon';
import { SimpleBar } from '@admin/components/wrappers/SimpleBar';
import { Card, CardHeader, CardTitle, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import { activityData } from './data';
const RecentActivity = () => {
  return <>
      <Card className="card-h-100">
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">Recent Activity</CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="activity" className="me-2" /> View Activity Log
              </DropdownItem>
              <DropdownItem>
                <Icon icon="filter-2" className="me-2" /> Filter Activities
              </DropdownItem>
              <DropdownItem>
                <Icon icon="download" className="me-2" /> Export Logs
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem className="text-danger">
                <Icon icon="trash" className="me-2" /> Clear Activity
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <SimpleBar className="card-body" style={{
        maxHeight: 426
      }}>
          <div className="timeline timeline-users">
            {activityData.map((item, idx) => <div className="timeline-item d-flex align-items-stretch" key={idx}>
                <div className={`timeline-dot ${item.className}`}>
                  <Icon icon={item.icon} className="fs-md" />
                </div>
                <div className="timeline-content ps-3 pb-4">
                  <h5 className="mb-1">{item.title}</h5>
                  <p className="mb-1 text-muted">{item.description}</p>
                  <span className="text-primary fw-semibold">
                    By {item.author}
                  </span>
                </div>
              </div>)}
          </div>
        </SimpleBar>
      </Card>
    </>;
};
export default RecentActivity;