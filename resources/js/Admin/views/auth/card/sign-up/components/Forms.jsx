import PasswordInputWithStrength from '@admin/components/PasswordInputWithStrength';
import Icon from '@admin/components/wrappers/Icon';
import { useState } from 'react';
import { Button, Form, FormCheck, FormControl, FormLabel } from 'react-bootstrap';
import FormCheckLabel from 'react-bootstrap/esm/FormCheckLabel';
const Forms = () => {
  const [password, setPassword] = useState('');
  return <Form>
      <div className="mb-3">
        <FormCheckLabel>
          Name
          <span className="text-danger">*</span>
        </FormCheckLabel>
        <div className="app-search">
          <FormControl type="text" id="userName" placeholder="__username__" required />
          <Icon icon="user" className="app-search-icon text-muted" />
        </div>
      </div>
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
      <div className="mb-3" data-password="bar">
        <PasswordInputWithStrength id="userPassword" label="Password" name="user-password" password={password} setPassword={setPassword} placeholder="••••••••" showIcon={true} />
      </div>
      <div className="mb-3">
        <FormCheck>
          <FormCheck.Input className="form-check-input-light fs-14" type="checkbox" defaultChecked id="termAndPolicy" />
          <FormCheck.Label>Agree the Terms &amp; Policy</FormCheck.Label>
        </FormCheck>
      </div>
      <div className="d-grid">
        <Button variant="primary" type="submit" className="fw-semibold py-2">
          Create Account
        </Button>
      </div>
    </Form>;
};
export default Forms;