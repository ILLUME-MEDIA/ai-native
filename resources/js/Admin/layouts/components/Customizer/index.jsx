import Icon from "@admin/components/wrappers/Icon";
import { SimpleBar } from "@admin/components/wrappers/SimpleBar";
import { useLayoutContext } from "@admin/context/useLayoutContext";
import { Button, Col, Offcanvas, Row } from "react-bootstrap";
import userBgPattern from "@admin/assets/images/user-bg-pattern.svg";
import Orientation from "./components/Orientation";
import Position from "./components/Position";
import SidenavColor from "./components/SidenavColor";
import SidenavSize from "./components/SidenavSize";
import Skin from "./components/Skin";
import Theme from "./components/Theme";
import TopBarColor from "./components/TopbarColor";
import Width from "./components/Width";
import SidenavUser from "./components/SidenavUser";
import Direction from "./components/Dir";
const Customizer = () => {
  const {
    isCustomizerOpen,
    toggleCustomizer,
    reset
  } = useLayoutContext();
  return <Offcanvas show={isCustomizerOpen} onHide={toggleCustomizer} placement="end" className="overflow-hidden" tabIndex={-1} id="theme-settings-offcanvas">
    <div className="d-flex justify-content-between text-bg-primary gap-2 p-3" style={{
      backgroundImage: `url(${userBgPattern})`
    }}>
      <div>
        <h5 className="mb-1 fw-bold text-white text-uppercase">
          Admin Customizer
        </h5>
        <p className="text-white text-opacity-75 fst-italic fw-medium mb-0">
          Easily configure layout, styles, and preferences for your admin
          interface.
        </p>
      </div>
      <div className="flex-grow-0">
        <button type="button" className="d-block btn btn-sm bg-white bg-opacity-25 text-white rounded-circle btn-icon" onClick={toggleCustomizer}>
          <Icon icon="x" className="fs-lg" />
        </button>
      </div>
    </div>
    <SimpleBar className="offcanvas-body theme-customizer-bar p-0 h-100">
      <Skin />

      <Theme />

      <TopBarColor />

      <Orientation />

      <SidenavColor />

      <SidenavSize />

      <Width />

      <Direction />

      <Position />
      <SidenavUser />
    </SimpleBar>
    <div className="offcanvas-footer border-top p-3 text-center">
      <Row className="justify-content-end">
        <Col sm={6}>
          <Button onClick={reset} variant="danger" type="button" className="fw-semibold py-2 w-100" id="reset-layout">
            Reset
          </Button>
        </Col>
      </Row>
    </div>
  </Offcanvas>;
};
export default Customizer;