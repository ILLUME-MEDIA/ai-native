import bgPattern from '@admin/assets/images/user-bg-pattern.svg';
import user1 from '@admin/assets/images/users/user-1.jpg';
import Icon from '@admin/components/wrappers/Icon';
import { useInitialProps } from '@admin/context/InitialPropsContext';
import { useRef } from 'react';
import { Link } from 'react-router';
import { Dropdown, DropdownHeader, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';

const UserProfileSettings = () => {
  const { user } = useInitialProps();
  const logoutFormRef = useRef(null);

  const handleLogout = (e) => {
    e.preventDefault();
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const input = logoutFormRef.current?.querySelector('[name="_token"]');
    if (input) input.value = token;
    logoutFormRef.current?.submit();
  };

  return <div id="user-profile-settings" className="sidenav-user" style={{
    background: `url(${bgPattern})`
  }}>
    {/* Hidden logout form */}
    <form ref={logoutFormRef} method="POST" action="/logout" style={{ display: 'none' }}>
      <input type="hidden" name="_token" value="" />
    </form>

    <div className="d-flex justify-content-between align-items-center">
      <div>
        <Link to="" className="link-reset">
          <img src={user1} alt="user-image" className="rounded-circle mb-2 avatar-md" />
          <span className="sidenav-user-name fw-bold">{user?.name || 'Admin'}</span>
          <span className="fs-12 fw-semibold d-block" style={{ opacity: 0.8 }}>
            {user?.email || ''}
          </span>
        </Link>
      </div>
      <div>
        <Dropdown align="end">
          <DropdownToggle as="a" href="#" className="drop-arrow-none link-reset sidenav-user-set-icon" aria-haspopup="false" aria-expanded={false}>
            <Icon icon="settings" className="fs-24 align-middle ms-1" />
          </DropdownToggle>
          <DropdownMenu>
            <DropdownHeader className="noti-title">
              <h6 className="text-overflow m-0">Welcome back!</h6>
            </DropdownHeader>
            <DropdownItem href="">
              <Icon icon="user-circle" className="me-1 fs-lg align-middle" />
              <span className="align-middle">Profile</span>
            </DropdownItem>
            <DropdownItem href="">
              <Icon icon="settings-2" className="me-1 fs-lg align-middle" />
              <span className="align-middle">Account Settings</span>
            </DropdownItem>
            <DropdownItem href="auth/lock-screen">
              <Icon icon="lock" className="me-1 fs-lg align-middle" />
              <span className="align-middle">Lock Screen</span>
            </DropdownItem>
            <DropdownItem onClick={handleLogout} className="text-danger fw-semibold" style={{ cursor: 'pointer' }}>
              <Icon icon="logout" className="me-1 fs-lg align-middle" />
              <span className="align-middle">Log Out</span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  </div>;
};
export default UserProfileSettings;
