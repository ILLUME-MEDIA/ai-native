import Icon from "@admin/components/wrappers/Icon";
import { showBackdrop, useLayoutContext } from "@admin/context/useLayoutContext";
import { Button } from "react-bootstrap";
const MenuToggler = () => {
  const {
    updateSettings,
    sidenavSize,
    orientation
  } = useLayoutContext();
  const toggleSideNav = () => {
    const currentSize = sidenavSize;
    if (currentSize === "offcanvas") {
      showBackdrop();
    } else if (sidenavSize === "compact") {
      updateSettings({
        sidenavSize: currentSize === "compact" ? "condensed" : "compact"
      });
    } else {
      updateSettings({
        sidenavSize: currentSize === "condensed" ? "default" : "condensed"
      });
    }
  };
  return (
    <>
      {orientation === "vertical" && (
        <Button
          variant="primary"
          className="sidenav-toggle-button btn-icon d-lg-none"
          onClick={toggleSideNav}
        >
          <Icon icon="menu-4" className="fs-22" />
        </Button>
      )}
      {orientation === "horizontal" && (
        <button
          onClick={showBackdrop}
          className="topnav-toggle-button px-2 d-lg-none"
          data-bs-toggle="collapse"
          data-bs-target="#topnav-menu"
        >
          <Icon icon="menu-4" />
        </button>
      )}
    </>
  );
};
export default MenuToggler;
