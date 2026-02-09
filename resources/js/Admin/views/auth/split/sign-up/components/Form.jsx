import PasswordInputWithStrength from '@admin/components/PasswordInputWithStrength';
import Icon from '@admin/components/wrappers/Icon';
import { META_DATA } from '@admin/config/constants';
import { useState } from 'react';
import { Button, Form, FormCheck, FormControl, FormLabel } from 'react-bootstrap';
const Forms = () => {
  const [password, setPassword] = useState('');
  return <>
      <Form className="mt-4">
        <div className="mb-3">
          <FormLabel>
            Full Name
            <span className="text-danger">*</span>
          </FormLabel>
          <div className="app-search">
            <FormControl type="text" id="userName" placeholder={META_DATA.username} required />
            <Icon icon="user-circle" className="app-search-icon text-muted" />
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
          <FormLabel>
            Password
            <span className="text-danger">*</span>
          </FormLabel>
          <PasswordInputWithStrength name="user-password" password={password} setPassword={setPassword} placeholder="Enter password" inputClassName="form-control" />
        </div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <FormCheck>
            <FormCheck.Input className="form-check-input-light fs-14" type="checkbox"></FormCheck.Input>
            <FormCheck.Label htmlFor="termAndPolicy">Agree the Terms &amp; Policy</FormCheck.Label>
          </FormCheck>
        </div>
        <div className="d-grid">
          <Button variant="primary" type="submit" className="fw-semibold py-2">
            Create Account
          </Button>
        </div>
      </Form>
    </>;
};
export default Forms;