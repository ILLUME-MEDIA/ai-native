import Icon from '@admin/components/wrappers/Icon';
import { Button, Form, FormCheck, FormControl, FormLabel } from 'react-bootstrap';
const ResetForm = () => {
  return <Form className="mt-4">
      <div className="mb-3">
        <FormLabel>
          Email address
          <span className="text-danger">*</span>
        </FormLabel>
        <div className="app-search">
          <FormControl type="email" id="userEmail" placeholder="you@example.com" required />
          <Icon icon="email" className="app-search-icon text-muted" />
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <FormCheck>
          <FormCheck.Input className="form-check-input-light fs-14" type="checkbox" id="termAndPolicy" />
          <FormCheck.Label>Agree the Terms & Policy</FormCheck.Label>
        </FormCheck>
      </div>

      <div className="d-grid">
        <Button variant="primary" type="submit" className="fw-semibold py-2">
          Send Request
        </Button>
      </div>
    </Form>;
};
export default ResetForm;