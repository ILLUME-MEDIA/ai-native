import useScrollEvent from "@admin/hooks/useScrollEvent";
import clsx from "clsx";
import { Container } from "react-bootstrap";
import { Link } from "react-router";
import AppsDropdownGrid from "./components/AppsDropdownGrid";
import CustomizerToggler from "./components/CustomizerToggler";
import FullscreenToggler from "./components/FullscreenToggler";
import LanguageSelectorRounded from "./components/LanguageSelectorRounded";
import MegamenuApps from "./components/MegamenuApps";
import MegamenuColumns from "./components/MegamenuColumns";
import MenuToggler from "./components/MenuToggler";
import MonochromeToggler from "./components/MonochromeToggler";
import NotificationDropdownPeople from "./components/NotificationDropdownPeople";
import SearchBoxRounded from "./components/SearchBoxRounded";
import ThemeDropdown from "./components/ThemeDropdown";
import UserDropdownDetailed from "./components/UserDropdownDetailed";
import logoBlack from "@admin/assets/images/logo-black.png";
import logoSm from "@admin/assets/images/logo-sm.png";
import logo from "@admin/assets/images/logo.png";
const TopBar = () => {
  const {
    scrollY
  } = useScrollEvent();
  return <header className={clsx("app-topbar", {
    "topbar-active": scrollY > 50
  })}>
      <Container fluid className="topbar-menu">
        <div className="d-flex align-items-center gap-2">
          <div className="logo-topbar">
            <Link to="/" className="logo-light">
              <span className="logo-lg">
                <img src={logo} alt="logo" />
              </span>
              <span className="logo-sm">
                <img src={logoSm} alt="small logo" />
              </span>
            </Link>
            <Link to="/" className="logo-dark">
              <span className="logo-lg">
                <img src={logoBlack} alt="dark logo" />
              </span>
              <span className="logo-sm">
                <img src={logoSm} alt="small logo" />
              </span>
            </Link>
          </div>

          <MenuToggler />

          <SearchBoxRounded />

          <MegamenuColumns />

          <MegamenuApps />
        </div>
        <div className="d-flex align-items-center gap-2">
          <ThemeDropdown />

          <AppsDropdownGrid />

          <NotificationDropdownPeople />
          
          <FullscreenToggler />

          <MonochromeToggler />

          <CustomizerToggler />

          <LanguageSelectorRounded />

          <UserDropdownDetailed />
        </div>
      </Container>
    </header>;
};
export default TopBar;