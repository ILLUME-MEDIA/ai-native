import Icon from '@admin/components/wrappers/Icon';
import { Button, Form, FormControl, FormLabel } from 'react-bootstrap';
const Forms = () => {
  return <>
      <Form>
        <div className="mb-3">
          <FormLabel>
            Password
            <span className="text-danger">*</span>
          </FormLabel>
          <div className="app-search">
            <Icon icon="lock-password" className="app-search-icon text-muted" />
            <FormControl type="password" placeholder="••••••••" required />
          </div>
        </div>
        <div className="d-grid">
          <Button variant="primary" type="submit" className="fw-semibold py-2">
            Unlock
          </Button>
        </div>
      </Form>
    </>;
};
export default Forms;