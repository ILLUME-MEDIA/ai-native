import { Link } from 'react-router';
import logo from '@admin/assets/images/logo.png';
import logoBlack from '@admin/assets/images/logo-black.png';
const AuthLogo = () => {
  return <div className="auth-brand text-center mb-4">
            <Link to="/" className="logo-dark">
                <img src={logoBlack} alt="dark logo" height="26" />
            </Link>
            <Link to="/" className="logo-light">
                <img src={logo} alt="logo" height="26" />
            </Link>
        </div>;
};
export default AuthLogo;