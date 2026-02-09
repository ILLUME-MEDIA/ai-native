import Icon from '@admin/components/wrappers/Icon';
import { Button, CardHeader, FormControl, FormSelect } from 'react-bootstrap';
import { useKanbanContext } from './useKanbanContext';
const KanbanHeader = () => {
  const {
    sectionModal
  } = useKanbanContext();
  return <CardHeader className="border-light align-items-center gap-2">
      <div className="app-search">
        <FormControl type="search" placeholder="Search by task name..." />
        <Icon icon="search" className="app-search-icon text-muted" />
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        <div className="app-search">
          <FormSelect className="form-control">
            <option>Team</option>
            <option value="Product">Product</option>
            <option value="Engineering">Engineering</option>
            <option value="UX Design">UX Design</option>
            <option value="Customer Success">Customer Success</option>
            <option value="Support">Support</option>
          </FormSelect>
          <Icon icon="users" className="app-search-icon text-muted" />
        </div>

        <div className="app-search">
          <FormSelect className="form-control">
            <option>Priority</option>
            <option value="Normal">Normal</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </FormSelect>
          <Icon icon="flag" className="app-search-icon text-muted" />
        </div>

        <div className="app-search">
          <FormSelect className="form-control">
            <option>Status</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Review">Review</option>
            <option value="Completed">Completed</option>
          </FormSelect>
          <Icon icon="circle-check" className="app-search-icon text-muted" />
        </div>
      </div>

      <Button variant="primary" type="submit" className="ms-lg-auto" onClick={() => sectionModal.toggle()}>
        <Icon icon="plus" className="me-1" /> Add New Task
      </Button>
    </CardHeader>;
};
export default KanbanHeader;