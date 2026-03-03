import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { useLayoutContext } from '@admin/context/useLayoutContext';
import Direction from '@admin/layouts/components/Customizer/components/Dir';
import Orientation from '@admin/layouts/components/Customizer/components/Orientation';
import Position from '@admin/layouts/components/Customizer/components/Position';
import SidenavColor from '@admin/layouts/components/Customizer/components/SidenavColor';
import SidenavSize from '@admin/layouts/components/Customizer/components/SidenavSize';
import SidenavUser from '@admin/layouts/components/Customizer/components/SidenavUser';
import Skin from '@admin/layouts/components/Customizer/components/Skin';
import Theme from '@admin/layouts/components/Customizer/components/Theme';
import TopbarColor from '@admin/layouts/components/Customizer/components/TopbarColor';
import Width from '@admin/layouts/components/Customizer/components/Width';
import { useState } from 'react';
import { Button, Card, Col, Nav, Row, Tab } from 'react-bootstrap';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_DEFS = [
  { key: 'primary',   label: 'Primary',   desc: 'Buttons, links, active states',      def: '#405189' },
  { key: 'secondary', label: 'Secondary', desc: 'Supporting / neutral actions',        def: '#74788d' },
  { key: 'success',   label: 'Success',   desc: 'Positive confirmations, badges',      def: '#0ab39c' },
  { key: 'danger',    label: 'Danger',    desc: 'Errors, delete, destructive actions', def: '#f06548' },
  { key: 'warning',   label: 'Warning',   desc: 'Alerts, caution indicators',          def: '#f7b84b' },
  { key: 'info',      label: 'Info',      desc: 'Informational messages, hints',       def: '#299cdb' },
];

const FONT_OPTIONS = [
  { name: 'Nunito',            tag: 'default' },
  { name: 'Inter',             tag: 'google' },
  { name: 'Roboto',            tag: 'google' },
  { name: 'Poppins',           tag: 'google' },
  { name: 'Outfit',            tag: 'google' },
  { name: 'DM Sans',           tag: 'google' },
  { name: 'Figtree',           tag: 'google' },
  { name: 'Plus Jakarta Sans', tag: 'google' },
  { name: 'Lato',              tag: 'google' },
  { name: 'Montserrat',        tag: 'google' },
  { name: 'Open Sans',         tag: 'google' },
  { name: 'Raleway',           tag: 'google' },
  { name: 'Source Sans 3',     tag: 'google' },
  { name: 'Ubuntu',            tag: 'google' },
  { name: 'Georgia',           tag: 'system' },
  { name: 'Arial',             tag: 'system' },
];

const SHADOW_OPTIONS = [
  { key: 'none',    label: 'None',    desc: 'Flat design' },
  { key: 'subtle',  label: 'Subtle',  desc: 'Barely visible' },
  { key: 'default', label: 'Default', desc: 'Theme default' },
  { key: 'medium',  label: 'Medium',  desc: 'Noticeable' },
  { key: 'bold',    label: 'Bold',    desc: 'Dramatic depth' },
];

const SHADOW_VALUES = {
  none:    'none',
  subtle:  '0 1px 3px rgba(0,0,0,0.08)',
  default: '0px 1px 4px 0px rgba(130,143,163,0.15)',
  medium:  '0 4px 14px rgba(0,0,0,0.12)',
  bold:    '0 8px 30px rgba(0,0,0,0.18)',
};

const RADIUS_PRESETS = [
  { label: 'Sharp',   value: 0 },
  { label: 'Slight',  value: 0.15 },
  { label: 'Default', value: 0.3 },
  { label: 'Rounded', value: 0.6 },
  { label: 'Roomy',   value: 1.0 },
  { label: 'Pill',    value: 1.5 },
];

// ─── Colors Tab ──────────────────────────────────────────────────────────────

const ColorsTab = () => {
  const { customColors, updateCustomColors, resetCustomColors } = useLayoutContext();
  const hasAny = Object.keys(customColors || {}).length > 0;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h5 className="fw-bold mb-1">Custom Colors</h5>
          <p className="text-muted small mb-0">
            Override any theme color. These win over the active skin. Leave blank to use the skin's built-in palette.
          </p>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={resetCustomColors} disabled={!hasAny}>
          Reset Colors
        </Button>
      </div>

      <Row className="g-3 mb-4">
        {COLOR_DEFS.map(({ key, label, desc, def }) => {
          const val = customColors?.[key] || '';
          return (
            <Col md={6} xl={4} key={key}>
              <div className="border rounded p-3 h-100">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="rounded border flex-shrink-0" style={{
                    width: 30, height: 30,
                    backgroundColor: val || def,
                    transition: 'background-color 0.2s',
                  }} />
                  <div>
                    <div className="fw-semibold" style={{ fontSize: 13 }}>{label}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{desc}</div>
                  </div>
                </div>
                <div className="input-group input-group-sm">
                  <input
                    type="color"
                    className="form-control form-control-color border-end-0"
                    style={{ maxWidth: 38, padding: '2px 3px', cursor: 'pointer' }}
                    value={val || def}
                    onChange={e => updateCustomColors({ [key]: e.target.value })}
                  />
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder={def}
                    value={val}
                    maxLength={7}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || /^#[0-9a-fA-F]{0,6}$/.test(v))
                        updateCustomColors({ [key]: v.length === 7 ? v : (v.length < 7 ? '' : v) });
                    }}
                  />
                  {val && (
                    <button className="btn btn-outline-secondary" type="button"
                      onClick={() => updateCustomColors({ [key]: '' })}>×</button>
                  )}
                </div>
                {!val && <div className="text-muted mt-1" style={{ fontSize: 10 }}>Using skin default</div>}
              </div>
            </Col>
          );
        })}
      </Row>

      {/* Preview */}
      <div className="border rounded p-3 bg-light">
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>
          Live Color Preview
        </div>
        <div className="d-flex gap-2 flex-wrap mb-2">
          {COLOR_DEFS.map(({ key, label, def }) => (
            <button key={key} className="btn btn-sm text-white fw-semibold" style={{
              backgroundColor: customColors?.[key] || def,
              borderColor: customColors?.[key] || def,
              fontSize: 11, padding: '3px 12px',
            }}>{label}</button>
          ))}
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {COLOR_DEFS.map(({ key, label, def }) => {
            const c = customColors?.[key] || def;
            return (
              <span key={key} className="badge" style={{
                backgroundColor: c + '22', color: c,
                border: `1px solid ${c}55`, fontSize: 10,
              }}>{label}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Typography Tab ───────────────────────────────────────────────────────────

const TypographyTab = () => {
  const { customStyles, updateCustomStyles, resetCustomStyles } = useLayoutContext();
  const currentFont  = customStyles?.fontFamily || '';
  const currentSize  = customStyles?.fontSize != null ? customStyles.fontSize : 14;
  const currentLH    = customStyles?.lineHeight != null ? parseFloat(customStyles.lineHeight) : 1.5;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h5 className="fw-bold mb-1">Typography</h5>
          <p className="text-muted small mb-0">Font family, size and line-height across the entire admin.</p>
        </div>
        <Button variant="outline-secondary" size="sm"
          onClick={() => {
            updateCustomStyles({ fontFamily: null, fontSize: null, lineHeight: null });
          }}>
          Reset Typography
        </Button>
      </div>

      {/* Font Family */}
      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        Font Family
      </div>
      <Row className="g-2 mb-4">
        {FONT_OPTIONS.map(({ name, tag }) => {
          const isSelected = currentFont === name || (!currentFont && name === 'Nunito');
          return (
            <Col xs={6} sm={4} md={3} xl={2} key={name}>
              <div
                onClick={() => updateCustomStyles({ fontFamily: name === 'Nunito' ? null : name })}
                className={`border rounded p-2 text-center ${isSelected ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                style={{ cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <div style={{ fontFamily: `"${name}", sans-serif`, fontSize: 20, lineHeight: 1.2, fontWeight: 600 }}>
                  Aa
                </div>
                <div style={{ fontSize: 10, marginTop: 3, lineHeight: 1.2 }}>{name}</div>
                {tag !== 'google' && (
                  <div style={{ fontSize: 9, color: '#aaa' }}>{tag}</div>
                )}
              </div>
            </Col>
          );
        })}
      </Row>

      {/* Font Size */}
      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        Base Font Size
      </div>
      <div className="mb-4">
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted small">12px</span>
          <span className="badge bg-primary">{currentSize}px</span>
          <span className="text-muted small">18px</span>
        </div>
        <input type="range" className="form-range" min={12} max={18} step={1}
          value={currentSize}
          onChange={e => updateCustomStyles({ fontSize: Number(e.target.value) })} />
        <div className="d-flex gap-2 mt-2">
          {[12, 13, 14, 15, 16, 17, 18].map(sz => (
            <button key={sz}
              className={`btn btn-sm ${currentSize === sz ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ fontSize: 10, padding: '2px 8px' }}
              onClick={() => updateCustomStyles({ fontSize: sz })}>
              {sz}px
            </button>
          ))}
        </div>
      </div>

      {/* Line Height */}
      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        Line Height
      </div>
      <div className="mb-4">
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted small">1.2 — Tight</span>
          <span className="badge bg-primary">{currentLH.toFixed(1)}</span>
          <span className="text-muted small">2.0 — Loose</span>
        </div>
        <input type="range" className="form-range" min={1.2} max={2.0} step={0.1}
          value={currentLH}
          onChange={e => updateCustomStyles({ lineHeight: parseFloat(e.target.value).toFixed(1) })} />
        <div className="d-flex gap-2 mt-2">
          {[1.2, 1.4, 1.5, 1.6, 1.8, 2.0].map(lh => (
            <button key={lh}
              className={`btn btn-sm ${Math.abs(currentLH - lh) < 0.05 ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ fontSize: 10, padding: '2px 8px' }}
              onClick={() => updateCustomStyles({ lineHeight: lh.toFixed(1) })}>
              {lh.toFixed(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        Live Preview
      </div>
      <div className="border rounded p-4" style={{
        fontFamily: currentFont ? `"${currentFont}", sans-serif` : undefined,
        fontSize: `${currentSize}px`,
        lineHeight: currentLH,
      }}>
        <h4 style={{ fontFamily: 'inherit', fontSize: `${Math.round(currentSize * 1.5)}px`, marginBottom: '0.5em' }}>
          The Quick Brown Fox Jumps Over
        </h4>
        <p style={{ marginBottom: '0.75em' }}>
          This paragraph shows how your selected font, size and line-height affect the readability
          of the admin dashboard. Good typography makes interfaces feel polished and professional.
        </p>
        <p className="text-muted mb-0" style={{ fontSize: `${currentSize - 1}px` }}>
          Supporting text • Metadata • Secondary information • Labels
        </p>
      </div>
    </div>
  );
};

// ─── Shape & Depth Tab ────────────────────────────────────────────────────────

const ShapeTab = () => {
  const { customStyles, updateCustomStyles } = useLayoutContext();
  const currentRadius = customStyles?.borderRadius != null ? parseFloat(customStyles.borderRadius) : 0.3;
  const currentShadow = customStyles?.boxShadow || 'default';

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h5 className="fw-bold mb-1">Shape &amp; Depth</h5>
          <p className="text-muted small mb-0">Control border radius, shadows and visual elevation across all components.</p>
        </div>
        <Button variant="outline-secondary" size="sm"
          onClick={() => updateCustomStyles({ borderRadius: null, boxShadow: null })}>
          Reset Shape
        </Button>
      </div>

      {/* Border Radius */}
      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        Border Radius
      </div>
      <div className="mb-2">
        <div className="d-flex justify-content-between mb-1">
          <span className="text-muted small">0 — Sharp corners</span>
          <span className="badge bg-primary">{currentRadius.toFixed(2)}rem</span>
          <span className="text-muted small">1.5rem — Pill</span>
        </div>
        <input type="range" className="form-range" min={0} max={1.5} step={0.05}
          value={currentRadius}
          onChange={e => updateCustomStyles({ borderRadius: parseFloat(e.target.value) })} />
      </div>
      <div className="d-flex gap-2 flex-wrap mb-4">
        {RADIUS_PRESETS.map(({ label, value }) => (
          <button key={label}
            className={`btn btn-sm ${Math.abs(currentRadius - value) < 0.01 ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ fontSize: 11, borderRadius: `${value}rem` }}
            onClick={() => updateCustomStyles({ borderRadius: value })}>
            {label}
          </button>
        ))}
      </div>

      {/* Box Shadow */}
      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        Box Shadow / Elevation
      </div>
      <Row className="g-2 mb-4">
        {SHADOW_OPTIONS.map(({ key, label, desc }) => (
          <Col xs={6} sm={4} md={3} xl={2} key={key}>
            <div
              onClick={() => updateCustomStyles({ boxShadow: key })}
              className={`border rounded p-2 text-center ${currentShadow === key ? 'border-primary bg-primary bg-opacity-10' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="rounded mx-auto mb-2" style={{
                width: 36, height: 36,
                background: 'white',
                boxShadow: SHADOW_VALUES[key],
                border: '1px solid #e7e9eb',
              }} />
              <div className="fw-semibold" style={{ fontSize: 11 }}>{label}</div>
              <div className="text-muted" style={{ fontSize: 10 }}>{desc}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Live Preview */}
      <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>
        Live Preview
      </div>
      <Row className="g-3">
        <Col md={4}>
          <div className="bg-white border p-3" style={{
            borderRadius: `${currentRadius}rem`,
            boxShadow: SHADOW_VALUES[currentShadow],
          }}>
            <div className="fw-semibold mb-1" style={{ fontSize: 13 }}>Card Component</div>
            <div className="text-muted" style={{ fontSize: 11 }}>Shadow + radius preview</div>
          </div>
        </Col>
        <Col md={4}>
          <div className="d-flex flex-column gap-2">
            <button className="btn btn-primary btn-sm" style={{ borderRadius: `${currentRadius}rem` }}>
              Primary Action
            </button>
            <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: `${currentRadius}rem` }}>
              Secondary Action
            </button>
            <span className="badge bg-primary" style={{ borderRadius: `${currentRadius}rem`, alignSelf: 'start', padding: '4px 10px' }}>
              Badge
            </span>
          </div>
        </Col>
        <Col md={4}>
          <div>
            <input type="text" className="form-control form-control-sm mb-2"
              style={{ borderRadius: `${currentRadius}rem` }}
              placeholder="Text input" readOnly />
            <select className="form-select form-select-sm mb-2"
              style={{ borderRadius: `${currentRadius}rem` }}>
              <option>Dropdown select</option>
            </select>
            <div className="input-group input-group-sm">
              <span className="input-group-text" style={{ borderRadius: `${currentRadius}rem 0 0 ${currentRadius}rem` }}>@</span>
              <input type="text" className="form-control" placeholder="Input group"
                style={{ borderRadius: `0 ${currentRadius}rem ${currentRadius}rem 0` }} readOnly />
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

// ─── Presets Tab ─────────────────────────────────────────────────────────────

const PresetsTab = () => (
  <div>
    <h5 className="fw-bold mb-1">Theme Presets</h5>
    <p className="text-muted small mb-3">
      Choose one of 25 built-in skins, then fine-tune color scheme, sidebar and topbar styles below.
    </p>
    <Row className="g-4">
      <Col xl={8}>
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Skin</div>
        <Skin />
      </Col>
      <Col xl={4}>
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Color Scheme</div>
        <Theme />
        <div className="text-uppercase fw-bold text-muted mb-2 mt-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Topbar Style</div>
        <TopbarColor />
        <div className="text-uppercase fw-bold text-muted mb-2 mt-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Sidebar Color</div>
        <SidenavColor />
      </Col>
    </Row>
    <hr className="my-3" />
    <Row className="g-4">
      <Col md={6} xl={4}>
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Sidebar Size</div>
        <SidenavSize />
      </Col>
      <Col md={6} xl={4}>
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Orientation &amp; Layout</div>
        <Orientation />
        <Width />
        <Position />
      </Col>
      <Col md={6} xl={4}>
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: 1.2 }}>Direction &amp; User Panel</div>
        <Direction />
        <SidenavUser />
      </Col>
    </Row>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const DesignSystemPage = () => {
  const { reset, skin, theme, customColors, customStyles } = useLayoutContext();
  const [activeTab, setActiveTab] = useState('presets');

  const colorCount  = Object.keys(customColors || {}).length;
  const styleCount  = Object.keys(customStyles || {}).length;
  const totalCustom = colorCount + styleCount;

  return (
    <>
      <PageBreadcrumb title="Design System" subtitle="Settings" />

      {/* Status bar */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3 p-2 rounded border">
        <i className="ri-palette-line text-primary" />
        <span className="fw-semibold small">Active:</span>
        <span className="badge bg-primary">{skin}</span>
        <span className="badge bg-secondary">{theme}</span>
        {totalCustom > 0 && (
          <span className="badge bg-success">{totalCustom} custom override{totalCustom !== 1 ? 's' : ''}</span>
        )}
        <span className="ms-auto text-muted small">
          Settings auto-saved to browser localStorage
        </span>
      </div>

      <Card>
        <Card.Body>
          <Tab.Container activeKey={activeTab} onSelect={k => setActiveTab(k)}>
            <Nav variant="tabs" className="mb-4">
              <Nav.Item>
                <Nav.Link eventKey="presets">
                  <i className="ri-layout-2-line me-1" />Presets
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="colors">
                  <i className="ri-palette-line me-1" />Colors
                  {colorCount > 0 && <span className="badge bg-primary ms-1" style={{ fontSize: 9 }}>{colorCount}</span>}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="typography">
                  <i className="ri-text me-1" />Typography
                  {customStyles?.fontFamily && <span className="badge bg-primary ms-1" style={{ fontSize: 9 }}>!</span>}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="shape">
                  <i className="ri-artboard-line me-1" />Shape &amp; Depth
                  {(customStyles?.borderRadius != null || customStyles?.boxShadow) && (
                    <span className="badge bg-primary ms-1" style={{ fontSize: 9 }}>!</span>
                  )}
                </Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content>
              <Tab.Pane eventKey="presets"><PresetsTab /></Tab.Pane>
              <Tab.Pane eventKey="colors"><ColorsTab /></Tab.Pane>
              <Tab.Pane eventKey="typography"><TypographyTab /></Tab.Pane>
              <Tab.Pane eventKey="shape"><ShapeTab /></Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Card.Body>

        <Card.Footer className="d-flex align-items-center gap-3">
          <Button variant="danger" onClick={reset}>
            Reset Everything to Defaults
          </Button>
          <span className="text-muted small">
            Clears all skin, color, typography and shape overrides.
          </span>
        </Card.Footer>
      </Card>
    </>
  );
};

export default DesignSystemPage;
