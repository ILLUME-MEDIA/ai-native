import OTPInput from '@admin/components/OTPInput';
import PasswordInputWithStrength from '@admin/components/PasswordInputWithStrength';
import Icon from '@admin/components/wrappers/Icon';
import { useState } from 'react';
import { Button, Form, FormCheck, FormControl, FormLabel } from 'react-bootstrap';
const NewPassForm = () => {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(Array(6).fill(''));
  return <>
      <Form>
        <div className="mb-3">
          <FormLabel>
            Email address
            <span className="text-danger">*</span>
          </FormLabel>

          <div className="app-search">
            <Icon icon="email" className="app-search-icon text-muted" />
            <FormControl type="email" placeholder="you@example.com" disabled />
          </div>
        </div>
        <div className="mb-3">
          <OTPInput code={code} setCode={setCode} label="Enter your 6-digit code" />
        </div>
        <div className="mb-3" data-password="bar">
          <PasswordInputWithStrength id="userPassword" label="Password" name="user-password" password={password} setPassword={setPassword} placeholder="••••••••" showIcon={true} />
        </div>
        <div className="mb-3">
          <FormLabel>
            Confirm New Password
            <span className="text-danger">*</span>
          </FormLabel>
          <div className="app-search">
            <FormControl type="password" id="confirmPassword" placeholder="••••••••" required />
            <Icon icon="lock-password" className="app-search-icon text-muted" />
          </div>
        </div>
        <div className="mb-3">
          <FormCheck>
            <FormCheck.Input className="form-check-input-light fs-14" type="checkbox" id="termAndPolicy" />
            <FormCheck.Label htmlFor="termAndPolicy">Agree the Terms &amp; Policy</FormCheck.Label>
          </FormCheck>
        </div>
        <div className="d-grid">
          <Button variant="primary" type="submit" className="fw-semibold py-2">
            Update Password
          </Button>
        </div>
      </Form>
    </>;
};
export default NewPassForm;