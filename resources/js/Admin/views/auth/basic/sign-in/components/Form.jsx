import { Link } from 'react-router';
import { Button, Form, FormCheck, FormControl, FormLabel } from 'react-bootstrap';
const LoginForm = () => {
  return <Form>
      <div className="mb-3">
        <FormLabel>
          Email address <span className="text-danger">*</span>
        </FormLabel>
        <FormControl type="email" placeholder="you@example.com" required />
      </div>
      <div className="mb-3">
        <FormLabel>
          Password <span className="text-danger">*</span>
        </FormLabel>
        <FormControl type="password" placeholder="••••••••" required />
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <FormCheck>
          <Form.Check.Input className="form-check-input-light fs-14" type="checkbox" id="rememberMe" />
          <Form.Check.Label htmlFor="rememberMe">Keep me signed in</Form.Check.Label>
        </FormCheck>
        <Link to="/auth/reset-pass" className="text-decoration-underline link-offset-3 text-muted">
          Forgot Password?
        </Link>
      </div>
      <div className="d-grid">
        <Button variant="primary" type="submit" className="fw-semibold py-2">
          Sign In
        </Button>
      </div>
    </Form>;
};
export default LoginForm;