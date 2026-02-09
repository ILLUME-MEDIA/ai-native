import OTPInput from '@admin/components/OTPInput';
import Icon from '@admin/components/wrappers/Icon';
import { useState } from 'react';
import { Button, Form, FormCheck, FormControl, FormLabel } from 'react-bootstrap';
const NewPassForm = () => {
  const [code, setCode] = useState(Array(6).fill(''));
  return <Form className="mt-4">
      <div className="mb-3">
        <OTPInput code={code} setCode={setCode} label="Enter your 6-digit code" labelClassName="d-flex" inputClassName="d-flex gap-2 two-factor" />
      </div>

      <div className="mb-3" data-password="bar">
        <FormLabel>
          New Password
          <span className="text-danger">*</span>
        </FormLabel>
        <div className="app-search">
          <FormControl type="password" id="userPassword" placeholder="••••••••" required />
          <Icon icon="lock-password" className="app-search-icon text-muted" />
        </div>
        <div className="password-bar my-2"></div>
        <p className="text-muted fs-xs mb-0">Use 8+ characters with letters, numbers & symbols.</p>
      </div>
      <div className="mb-3 d-flex">
        <FormCheck>
          <FormCheck.Input className="form-check-input-light fs-14" type="checkbox" defaultChecked id="termAndPolicy" />
          <FormCheck.Label htmlFor="termAndPolicy">Agree the Terms &amp; Policy</FormCheck.Label>
        </FormCheck>
      </div>
      <div className="d-grid">
        <Button variant="primary" type="submit" className="fw-semibold py-2">
          Update Password
        </Button>
      </div>
    </Form>;
};
export default NewPassForm;