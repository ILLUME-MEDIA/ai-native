import { Link } from 'react-router';
import logoBlack from '@admin/assets/images/logo-black.png';
import logoSm from '@admin/assets/images/logo-sm.png';
import logo from '@admin/assets/images/logo.png';
const AppLogo = () => {
  return <Link to="/" className="logo">
      <span className="logo logo-light">
        <span className="logo-lg">
          <img width={102} height={22} src={logo} alt="logo" />
        </span>
        <span className="logo-sm">
          <img width={30} height={30} src={logoSm} alt="small logo" />
        </span>
      </span>
      <span className="logo logo-dark">
        <span className="logo-lg">
          <img width={102} height={22} src={logoBlack} alt="dark logo" />
        </span>
        <span className="logo-sm">
          <img width={30} height={30} src={logoSm} alt="small logo" />
        </span>
      </span>
    </Link>;
};
export default AppLogo;