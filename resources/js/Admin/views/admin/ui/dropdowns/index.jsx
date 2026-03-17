import { useState, useEffect } from 'react';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownDivider, DropdownHeader, DropdownItem, DropdownMenu, DropdownToggle, Form, FormCheck, FormControl, FormLabel, Row } from 'react-bootstrap';

// ── Design Tokens API ─────────────────────────────────────────────────────────
const DS_API = '/api/admin/design-system';

function apiCall(path) {
  return fetch(DS_API + path, { headers: { Accept: 'application/json' } }).then(r => r.json());
}

function hexToRgb(hex) {
  const m = hex?.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : null;
}

function buildCss(map) {
  const names = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];
  const lines = [':root {'];
  for (const n of names) {
    const v = map[`color.${n}`]; if (!v) continue;
    lines.push(`  --bs-${n}: ${v};`);
    const rgb = hexToRgb(v); if (rgb) lines.push(`  --bs-${n}-rgb: ${rgb};`);
  }
  lines.push('}');
  return lines.join('\n');
}

function injectCss(css) {
  let el = document.getElementById('dsm-token-css');
  if (!el) { el = document.createElement('style'); el.id = 'dsm-token-css'; document.head.appendChild(el); }
  el.textContent = css;
}

function useColorTokens() {
  const [colorMap, setColorMap] = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    apiCall('/themes').then(themes => {
      const theme = themes?.find(t => t.is_default) ?? themes?.[0];
      if (!theme) { setLoading(false); return; }
      apiCall(`/tokens?theme_id=${theme.id}`).then(rows => {
        const map = {};
        (rows ?? []).forEach(t => { map[t.name] = t.value; });
        setColorMap(map);
        injectCss(buildCss(map));
        setLoading(false);
      });
    }).catch(() => setLoading(false));
  }, []);

  return { colorMap, loading };
}

function tokenHelpers(colorMap) {
  const get = (name) => colorMap[`color.${name}`] || null;
  const rgb = (name) => { const v = get(name); return v ? hexToRgb(v) : null; };

  const bgStyle = (name) => {
    const v = get(name);
    return v ? { backgroundColor: v, color: '#fff', borderColor: v } : {};
  };
  const softBgStyle = (name) => {
    const r = rgb(name);
    return r ? { backgroundColor: `rgba(${r},0.15)` } : {};
  };
  const outlineStyle = (name) => {
    const v = get(name);
    return v ? { borderColor: v, color: v } : {};
  };

  return { get, bgStyle, softBgStyle, outlineStyle };
}

// ── Data ──────────────────────────────────────────────────────────────────────
const colorVariants = [
  { name: 'Primary',   token: 'primary',   soft: false },
  { name: 'Secondary', token: 'secondary', soft: false },
  { name: 'Success',   token: 'success',   soft: true  },
  { name: 'Info',      token: 'info',      soft: false },
];

// ── Page ──────────────────────────────────────────────────────────────────────
const Page = () => {
  const { colorMap } = useColorTokens();
  const tokens = tokenHelpers(colorMap);

  return <>
    <PageBreadcrumb title="Dropdowns" subtitle="UI" />
    <Row>
      <Col xl={6}><SingleButtonDropdowns tokens={tokens} /></Col>
      <Col xl={6}><MenuAlignment tokens={tokens} /></Col>
      <Col xl={6}><CustomDropdownArrow tokens={tokens} /></Col>
      <Col xl={6}><SplitButtonDropdowns tokens={tokens} /></Col>
      <Col xl={6}><VariantDropDowns tokens={tokens} /></Col>
      <Col xl={6}><Sizing tokens={tokens} /></Col>
      <Col xl={6}><DropupVariation tokens={tokens} /></Col>
      <Col xl={6}><DropstartVariation tokens={tokens} /></Col>
      <Col xl={6}><DropendVariation tokens={tokens} /></Col>
      <Col xl={6}><ActiveItem tokens={tokens} /></Col>
      <Col xl={6}><DisabledItem tokens={tokens} /></Col>
      <Col xl={6}><Headers tokens={tokens} /></Col>
      <Col xl={6}><DarkDropdowns tokens={tokens} /></Col>
      <Col xl={6}><CenteredDropdowns tokens={tokens} /></Col>
      <Col xl={6}><DropdownOptions tokens={tokens} /></Col>
      <Col xl={6}><AutoCloseBehavior tokens={tokens} /></Col>
      <Col xl={6}><Text tokens={tokens} /></Col>
      <Col xl={6}><FormsDropdown tokens={tokens} /></Col>
    </Row>
  </>;
};
export default Page;

// ── Single Button Dropdowns ───────────────────────────────────────────────────
const SingleButtonDropdowns = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Single Button Dropdowns</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Any single <code>.btn</code> can be turned into a dropdown toggle with some markup changes.
        Here&apos;s how you can put them to work with either <code>&lt;button&gt;</code> elements:
      </p>
      <div className="d-flex flex-wrap gap-2">
        <Dropdown>
          <DropdownToggle as="button" className="btn btn-light">Choose Option</DropdownToggle>
          <DropdownMenu>
            <DropdownItem href="#">Profile Settings</DropdownItem>
            <DropdownItem href="#">Notifications</DropdownItem>
            <DropdownItem href="#">Logout</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown>
          <DropdownToggle as="button" className="btn btn-primary" style={tokens.bgStyle('primary')}>
            Quick Actions
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem href="#">Create New</DropdownItem>
            <DropdownItem href="#">Upload File</DropdownItem>
            <DropdownItem href="#">View Reports</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </CardBody>
  </Card>
);

// ── Menu Alignment ────────────────────────────────────────────────────────────
const MenuAlignment = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Menu Alignment</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Add <code>.dropdown-menu-end</code> to a <code>.dropdown-menu</code> to right align the dropdown menu.
      </p>
      <Dropdown>
        <DropdownToggle variant="light">Right-aligned menu</DropdownToggle>
        <DropdownMenu align="end">
          <DropdownItem href="#">Action</DropdownItem>
          <DropdownItem href="#">Another action</DropdownItem>
          <DropdownItem href="#">Something else here</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </CardBody>
  </Card>
);

// ── Custom Dropdown Arrow ─────────────────────────────────────────────────────
const CustomDropdownArrow = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Custom Dropdown Arrow</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Any single <code>.btn</code> can be turned into a dropdown toggle with some markup changes.
        Here&apos;s how you can put them to work with either <code>&lt;button&gt;</code> elements:
      </p>
      <div className="d-flex flex-wrap gap-2">
        <Dropdown>
          <DropdownToggle
            as="button"
            className="btn btn-primary drop-arrow-none"
            style={tokens.bgStyle('primary')}
          >
            Without Arrow
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem href="#">Download Report</DropdownItem>
            <DropdownItem href="#">View Analytics</DropdownItem>
            <DropdownItem href="#">Export Data</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown>
          <DropdownToggle
            as="button"
            className="btn btn-outline-primary drop-arrow-none"
            style={tokens.outlineStyle('primary')}
          >
            Custom Icon <Icon icon="chevron-down" className="ms-1" />
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem href="#">Edit Profile</DropdownItem>
            <DropdownItem href="#">Account Settings</DropdownItem>
            <DropdownItem href="#">Sign Out</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </CardBody>
  </Card>
);

// ── Split Button Dropdowns ────────────────────────────────────────────────────
const SplitButtonDropdowns = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Split Button Dropdowns</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Similarly, create split button dropdowns with virtually the same markup as single button dropdowns,
        but with the addition of <code>.dropdown-toggle-split</code> for proper spacing around the dropdown caret.
      </p>
      <div className="d-flex flex-wrap gap-2">
        {colorVariants.map((item, idx) => {
          const style = item.soft ? tokens.softBgStyle(item.token) : tokens.bgStyle(item.token);
          return (
            <Dropdown className="btn-group" key={idx}>
              <Button className="btn btn-primary" style={style}>{item.name}</Button>
              <DropdownToggle split className="btn btn-primary drop-arrow-none" style={style}>
                <Icon icon="chevron-down" />
              </DropdownToggle>
              <DropdownMenu>
                <DropdownItem>Action</DropdownItem>
                <DropdownItem>Another action</DropdownItem>
                <DropdownItem>Something else here</DropdownItem>
                <DropdownDivider />
                <DropdownItem>Separated link</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          );
        })}
      </div>
    </CardBody>
  </Card>
);

// ── Variant ───────────────────────────────────────────────────────────────────
const VariantDropDowns = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Variant</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">The best part is you can do this with any button variant, too:</p>
      <div className="d-flex flex-wrap gap-2">
        {colorVariants.map((item, idx) => {
          const style = item.soft ? tokens.softBgStyle(item.token) : tokens.bgStyle(item.token);
          return (
            <Dropdown className="btn-group" key={idx}>
              <DropdownToggle as="button" className="btn btn-primary" style={style}>
                {item.name}
              </DropdownToggle>
              <DropdownMenu>
                <DropdownItem>Action</DropdownItem>
                <DropdownItem>Another action</DropdownItem>
                <DropdownItem>Something else here</DropdownItem>
                <DropdownDivider />
                <DropdownItem>Separated link</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          );
        })}
      </div>
    </CardBody>
  </Card>
);

// ── Sizing ────────────────────────────────────────────────────────────────────
const Sizing = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Sizing</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">Button dropdowns work with buttons of all sizes, including default and split dropdown buttons.</p>
      <div className="d-flex flex-wrap gap-2">
        <Dropdown className="btn-group">
          <DropdownToggle variant="light" size="lg">Large button</DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Action</DropdownItem>
            <DropdownItem>Another action</DropdownItem>
            <DropdownItem>Something else here</DropdownItem>
            <DropdownDivider />
            <DropdownItem>Separated link</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown className="btn-group">
          <button className="btn btn-light btn-lg" type="button">Large button</button>
          <DropdownToggle variant="light" size="lg" split>
            <span className="visually-hidden">Toggle Dropdown</span>
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Action</DropdownItem>
            <DropdownItem>Another action</DropdownItem>
            <DropdownItem>Something else here</DropdownItem>
            <DropdownDivider />
            <DropdownItem>Separated link</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown className="btn-group">
          <DropdownToggle variant="light" size="sm">Small button</DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Action</DropdownItem>
            <DropdownItem>Another action</DropdownItem>
            <DropdownItem>Something else here</DropdownItem>
            <DropdownDivider />
            <DropdownItem>Separated link</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown className="btn-group">
          <Button variant="light" size="sm">Small button</Button>
          <DropdownToggle variant="light" size="sm" split>
            <span className="visually-hidden">Toggle Dropdown</span>
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Action</DropdownItem>
            <DropdownItem>Another action</DropdownItem>
            <DropdownItem>Something else here</DropdownItem>
            <DropdownDivider />
            <DropdownItem>Separated link</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </CardBody>
  </Card>
);

// ── Dropup Variation ──────────────────────────────────────────────────────────
const DropupVariation = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Dropup Variation</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Trigger dropdown menus above elements by adding <code>.dropup</code> to the parent element.
      </p>
      <div className="d-flex flex-wrap gap-2">
        <Dropdown drop="up" className="btn-group">
          <DropdownToggle variant="light">Dropup</DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Action</DropdownItem>
            <DropdownItem>Another action</DropdownItem>
            <DropdownItem>Something else here</DropdownItem>
            <DropdownDivider />
            <DropdownItem>Separated link</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown drop="up" className="btn-group">
          <Button
            as="button"
            className="btn btn-primary"
            style={tokens.bgStyle('primary')}
          >
            Split dropup
          </Button>
          <DropdownToggle
            as="button"
            className="btn btn-primary"
            style={tokens.bgStyle('primary')}
            split
          >
            <span className="visually-hidden">Toggle Dropdown</span>
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Action</DropdownItem>
            <DropdownItem>Another action</DropdownItem>
            <DropdownItem>Something else here</DropdownItem>
            <DropdownDivider />
            <DropdownItem>Separated link</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </CardBody>
  </Card>
);

// ── Dropstart Variation ───────────────────────────────────────────────────────
const DropstartVariation = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Dropstart Variation</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Trigger dropdown menus at the left of the elements by adding <code>.dropleft</code> to the parent element.
      </p>
      <div className="d-flex flex-wrap gap-2">
        <Dropdown drop="start">
          <DropdownToggle
            as="button"
            className="btn btn-secondary"
            style={tokens.bgStyle('secondary')}
          >
            Dropstart
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Action</DropdownItem>
            <DropdownItem>Another action</DropdownItem>
            <DropdownItem>Something else here</DropdownItem>
            <DropdownDivider />
            <DropdownItem>Separated link</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown drop="start" className="btn-group">
          <DropdownToggle
            as="button"
            className="btn btn-secondary"
            style={tokens.bgStyle('secondary')}
            split
          >
            <span className="visually-hidden">Toggle Dropdown</span>
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Action</DropdownItem>
            <DropdownItem>Another action</DropdownItem>
            <DropdownItem>Something else here</DropdownItem>
            <DropdownDivider />
            <DropdownItem>Separated link</DropdownItem>
          </DropdownMenu>
          <Button
            as="button"
            className="btn btn-secondary"
            style={tokens.bgStyle('secondary')}
          >
            Split Dropstart
          </Button>
        </Dropdown>
      </div>
    </CardBody>
  </Card>
);

// ── Dropend Variation ─────────────────────────────────────────────────────────
const DropendVariation = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Dropend Variation</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Trigger dropdown menus at the right of the elements by adding <code>.dropend</code> to the parent element.
      </p>
      <div className="d-flex flex-wrap gap-2">
        <Dropdown drop="end">
          <DropdownToggle variant="primary" style={tokens.bgStyle('primary')}>Dropend</DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Action</DropdownItem>
            <DropdownItem>Another action</DropdownItem>
            <DropdownItem>Something else here</DropdownItem>
            <DropdownDivider />
            <DropdownItem>Separated link</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown drop="end" className="btn-group">
          <Button variant="primary" style={tokens.bgStyle('primary')}>Split Dropend</Button>
          <DropdownToggle variant="primary" style={tokens.bgStyle('primary')} split>
            <span className="visually-hidden">Toggle Dropright</span>
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Action</DropdownItem>
            <DropdownItem>Another action</DropdownItem>
            <DropdownItem>Something else here</DropdownItem>
            <DropdownDivider />
            <DropdownItem>Separated link</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </CardBody>
  </Card>
);

// ── Active Item ───────────────────────────────────────────────────────────────
const ActiveItem = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Active Item</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Add <code>.active</code> to item in the dropdown to <strong>style them as active</strong>.
      </p>
      <Dropdown className="btn-group">
        <DropdownToggle variant="secondary" style={tokens.bgStyle('secondary')}>Active Item</DropdownToggle>
        <DropdownMenu>
          <DropdownItem>Regular link</DropdownItem>
          <DropdownItem active>Active link</DropdownItem>
          <DropdownItem>Another link</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </CardBody>
  </Card>
);

// ── Disabled Item ─────────────────────────────────────────────────────────────
const DisabledItem = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Disabled Item</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Add <code>.disabled</code> to items in the dropdown to <strong>style them as disabled</strong>.
      </p>
      <Dropdown className="btn-group">
        <DropdownToggle variant="primary" style={tokens.bgStyle('primary')}>Disabled</DropdownToggle>
        <DropdownMenu>
          <DropdownItem>Regular link</DropdownItem>
          <DropdownItem disabled>Disabled link</DropdownItem>
          <DropdownItem>Another link</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </CardBody>
  </Card>
);

// ── Headers ───────────────────────────────────────────────────────────────────
const Headers = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Headers</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">Add a header to label sections of actions in any dropdown menu.</p>
      <Dropdown className="btn-group">
        <DropdownToggle variant="secondary" style={tokens.bgStyle('secondary')}>Header</DropdownToggle>
        <DropdownMenu>
          <DropdownHeader as="h6">Dropdown header</DropdownHeader>
          <DropdownItem>Action</DropdownItem>
          <DropdownItem>Another action</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </CardBody>
  </Card>
);

// ── Dark Dropdowns ────────────────────────────────────────────────────────────
const DarkDropdowns = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Dark dropdowns</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Opt into darker dropdowns to match a dark navbar or custom style by adding <code>.dropdown-menu-dark</code> onto
        an existing <code>.dropdown-menu</code>. No changes are required to the dropdown items.
      </p>
      <Dropdown>
        <DropdownToggle variant="dark" style={tokens.bgStyle('dark')}>Dark Dropdown</DropdownToggle>
        <DropdownMenu data-bs-theme="dark">
          <DropdownItem active>Action</DropdownItem>
          <DropdownItem href="">Another action</DropdownItem>
          <DropdownItem href="">Something else here</DropdownItem>
          <DropdownDivider />
          <DropdownItem href="">Separated link</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </CardBody>
  </Card>
);

// ── Centered Dropdowns ────────────────────────────────────────────────────────
const CenteredDropdowns = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Centered dropdowns</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Make the dropdown menu centered below the toggle with <code>.dropdown-center</code> on the parent element.
      </p>
      <div className="hstack gap-2">
        <Dropdown drop="down-centered">
          <DropdownToggle variant="secondary" style={tokens.bgStyle('secondary')}>Centered dropdown</DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Action</DropdownItem>
            <DropdownItem>Action two</DropdownItem>
            <DropdownItem>Action three</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown drop="up-centered">
          <DropdownToggle variant="secondary" style={tokens.bgStyle('secondary')}>Centered dropup</DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Action</DropdownItem>
            <DropdownItem>Action two</DropdownItem>
            <DropdownItem>Action three</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </CardBody>
  </Card>
);

// ── Dropdown Options ──────────────────────────────────────────────────────────
const DropdownOptions = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Dropdown Options</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Use <code>data-bs-offset</code> or <code>data-bs-reference</code> to change the location of the dropdown.
      </p>
      <div className="d-flex flex-wrap gap-2">
        <Dropdown drop="end" className="btn-group">
          <DropdownToggle variant="secondary" style={tokens.bgStyle('secondary')}>Offset</DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Profile Settings</DropdownItem>
            <DropdownItem>Privacy Settings</DropdownItem>
            <DropdownItem>Notification Preferences</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown drop="end" className="btn-group">
          <Button variant="secondary" style={tokens.bgStyle('secondary')}>Reference</Button>
          <DropdownToggle split variant="secondary" style={tokens.bgStyle('secondary')}>
            <span className="visually-hidden">Toggle Dropdown</span>
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Manage Subscription</DropdownItem>
            <DropdownItem>Account Preferences</DropdownItem>
            <DropdownItem>Help &amp; Support</DropdownItem>
            <DropdownDivider />
            <DropdownItem>Log Out</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </CardBody>
  </Card>
);

// ── Auto Close Behavior ───────────────────────────────────────────────────────
const AutoCloseBehavior = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Auto close behavior</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        By default, the dropdown menu is closed when clicking inside or outside the dropdown menu.
        You can use the <code>autoClose</code> option to change this behavior of the dropdown.
      </p>
      <div className="hstack gap-2 flex-wrap">
        <Dropdown autoClose className="btn-group">
          <DropdownToggle variant="secondary" style={tokens.bgStyle('secondary')}>Default dropdown</DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Menu item</DropdownItem>
            <DropdownItem>Menu item</DropdownItem>
            <DropdownItem>Menu item</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown autoClose="outside" className="btn-group">
          <DropdownToggle variant="secondary" style={tokens.bgStyle('secondary')}>Clickable inside</DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Menu item</DropdownItem>
            <DropdownItem>Menu item</DropdownItem>
            <DropdownItem>Menu item</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown autoClose="inside" className="btn-group">
          <DropdownToggle variant="secondary" style={tokens.bgStyle('secondary')}>Clickable outside</DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Menu item</DropdownItem>
            <DropdownItem>Menu item</DropdownItem>
            <DropdownItem>Menu item</DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <Dropdown autoClose={false} className="btn-group">
          <DropdownToggle variant="secondary" style={tokens.bgStyle('secondary')}>Manual close</DropdownToggle>
          <DropdownMenu>
            <DropdownItem>Menu item</DropdownItem>
            <DropdownItem>Menu item</DropdownItem>
            <DropdownItem>Menu item</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </CardBody>
  </Card>
);

// ── Text ──────────────────────────────────────────────────────────────────────
const Text = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Text</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Place any freeform text within a dropdown menu with text and use spacing utilities.
        Note that you&apos;ll likely need additional sizing styles to constrain the menu width.
      </p>
      <Dropdown className="btn-group">
        <DropdownToggle variant="primary" style={tokens.bgStyle('primary')}>Text Dropdown</DropdownToggle>
        <DropdownMenu className="p-3 text-muted" style={{ maxWidth: 200 }}>
          <p>Some example text that&apos;s free-flowing within the dropdown menu.</p>
          <p className="mb-0">And this is more example text.</p>
        </DropdownMenu>
      </Dropdown>
    </CardBody>
  </Card>
);

// ── Forms Dropdown ────────────────────────────────────────────────────────────
const FormsDropdown = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Forms</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Put a form within a dropdown menu, or make it into a dropdown menu, and use margin or padding utilities
        to give it the negative space you require.
      </p>
      <Dropdown>
        <DropdownToggle variant="secondary" style={tokens.bgStyle('secondary')}>Form</DropdownToggle>
        <DropdownMenu>
          <Form className="px-4 py-3">
            <div className="mb-3">
              <FormLabel htmlFor="dropdownFormEmail">Email address</FormLabel>
              <FormControl type="email" id="dropdownFormEmail" placeholder="email@example.com" />
            </div>
            <div className="mb-3">
              <FormLabel htmlFor="dropdownFormPassword">Password</FormLabel>
              <FormControl type="password" id="dropdownFormPassword" placeholder="Password" />
            </div>
            <div className="mb-2">
              <FormCheck>
                <FormCheck.Input type="checkbox" id="dropdownCheck" />
                <FormCheck.Label htmlFor="dropdownCheck">Remember me</FormCheck.Label>
              </FormCheck>
            </div>
            <Button variant="primary" type="submit" style={tokens.bgStyle('primary')}>Sign in</Button>
          </Form>
          <DropdownDivider />
          <DropdownItem>New around here? Sign up</DropdownItem>
          <DropdownItem>Forgot password?</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </CardBody>
  </Card>
);
