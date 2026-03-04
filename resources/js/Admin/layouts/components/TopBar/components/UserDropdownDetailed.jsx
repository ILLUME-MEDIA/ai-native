import User1 from "@admin/assets/images/users/user-1.jpg";
import Icon from "@admin/components/wrappers/Icon";
import { META_DATA } from "@admin/config/constants";
import { Dropdown, DropdownDivider, DropdownHeader, DropdownItem, DropdownMenu, DropdownToggle } from "react-bootstrap";
import { Fragment, useRef } from "react";
const menuItems = [{
  id: "profile",
  label: "Profile",
  icon: "user-circle",
  link: ""
}, {
  id: "notifications",
  label: "Notifications",
  icon: "bell-ringing",
  link: ""
}, {
  id: "settings",
  label: "Account Settings",
  icon: "settings-2",
  link: ""
}, {
  id: "support",
  label: "Support Center",
  icon: "headset",
  link: "",
  divider: true
}, {
  id: "lock",
  label: "Lock Screen",
  icon: "lock",
  link: "/auth/lock-screen"
}, {
  id: "logout",
  label: "Log Out",
  icon: "logout",
  link: "",
  isSemibold: true
}];
const UserDropdown = () => {
  const logoutFormRef = useRef(null);
  
  const handleLogout = (e) => {
    e.preventDefault();
    // Submit logout form
    if (logoutFormRef.current) {
      logoutFormRef.current.submit();
    }
  };

  return <div id="user-dropdown-detailed" className="topbar-item nav-user">
    {/* Hidden logout form */}
    <form ref={logoutFormRef} method="POST" action="/logout" style={{ display: 'none' }}>
      <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''} />
    </form>
    
    <Dropdown>
      <DropdownToggle className="topbar-link drop-arrow-none px-2">
        <img src={User1} width={32} className="rounded-circle  me-lg-2 d-flex" alt="user-image" />
        <div className="d-lg-flex align-items-center gap-1 d-none">
          <span>
            <h5 className="my-0 lh-1 pro-username">{META_DATA.username}</h5>
            <span className="fs-xs lh-1">Admin Head</span>
          </span>
          <Icon icon="chevron-down" className="align-middle" />
        </div>
      </DropdownToggle>
      <DropdownMenu className="dropdown-menu-end">
        <DropdownHeader className="noti-title">
          <h6 className="text-overflow m-0">Welcome back 👋!</h6>
        </DropdownHeader>

        {menuItems.map(item => <Fragment key={item.id}>
          {item.id === 'logout' ? (
            <DropdownItem onClick={handleLogout} className={item.isSemibold ? "fw-semibold" : ""}>
              <Icon icon={item.icon} className="me-1 fs-lg align-middle" />
              <span className="align-middle">{item.label}</span>
            </DropdownItem>
          ) : (
            <DropdownItem href={item.link} className={item.isSemibold ? "fw-semibold" : ""}>
              <Icon icon={item.icon} className="me-1 fs-lg align-middle" />
              <span className="align-middle">{item.label}</span>
            </DropdownItem>
          )}
          {item.divider && <DropdownDivider />}
        </Fragment>)}
      </DropdownMenu>
    </Dropdown>
  </div>;
};
export default UserDropdown;