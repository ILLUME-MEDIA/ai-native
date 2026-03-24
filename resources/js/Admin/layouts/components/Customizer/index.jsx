import Icon from "@admin/components/wrappers/Icon";
import { SimpleBar } from "@admin/components/wrappers/SimpleBar";
import { useLayoutContext } from "@admin/context/useLayoutContext";
import { Button, Col, Offcanvas, Row } from "react-bootstrap";
import { Link } from "react-router";
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
    reset,
    settings,
    updateCustomColors,
  } = useLayoutContext();

  const customColors = settings?.customColors || {};

  const colorTokens = [
    { key: 'primary',   label: 'Primary',   icon: 'circle' },
    { key: 'secondary', label: 'Secondary',  icon: 'circle' },
    { key: 'success',   label: 'Success',    icon: 'circle' },
    { key: 'danger',    label: 'Danger',     icon: 'circle' },
    { key: 'warning',   label: 'Warning',    icon: 'circle' },
    { key: 'info',      label: 'Info',       icon: 'circle' },
  ];
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

      {/* Design Tokens */}
      <div className="p-3 border-top">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h6 className="mb-0 fw-semibold text-uppercase fs-sm">Design Tokens</h6>
          <Link to="/admin/settings/design-system" className="text-primary fs-xs fw-medium" onClick={toggleCustomizer}>
            Full Editor →
          </Link>
        </div>
        <p className="text-muted fs-xs mb-3">
          Color changes save to DB and sync across all tabs in real-time.
        </p>
        <div className="d-flex flex-wrap gap-2">
          {colorTokens.map(({ key, label }) => {
            const current = customColors?.[key] || '';
            return (
              <div key={key} className="d-flex flex-column align-items-center gap-1" style={{ width: '48px' }}>
                <div className="position-relative" style={{ width: 32, height: 32 }}>
                  <div
                    className="rounded-circle border shadow-sm w-100 h-100"
                    style={{ backgroundColor: current || `var(--bs-${key})`, cursor: 'pointer' }}
                    onClick={() => document.getElementById(`cc-${key}`)?.click()}
                  />
                  <input
                    id={`cc-${key}`}
                    type="color"
                    className="position-absolute opacity-0"
                    style={{ width: 0, height: 0, top: 0, left: 0 }}
                    value={current || '#ffffff'}
                    onChange={e => updateCustomColors({ [key]: e.target.value })}
                  />
                </div>
                <span className="text-muted" style={{ fontSize: '10px', lineHeight: 1 }}>{label}</span>
              </div>
            );
          })}
        </div>
        <Button
          size="sm"
          variant="outline-secondary"
          className="mt-3 w-100 py-1"
          onClick={() => updateCustomColors({ primary: '', secondary: '', success: '', danger: '', warning: '', info: '' })}
        >
          Reset Colors
        </Button>
      </div>
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