import { useState, useEffect } from 'react';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { useOffcanvasContext } from '@admin/context/useOffcanvasContext';
import { openOffcanvas } from '@admin/utils/offcanvas';
import {
  Button, Card, CardBody, CardHeader, CardTitle, Col, Row,
  Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle,
} from 'react-bootstrap';
import { useToggle } from 'usehooks-ts';

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
  useEffect(() => {
    apiCall('/themes').then(themes => {
      const theme = themes?.find(t => t.is_default) ?? themes?.[0];
      if (!theme) return;
      apiCall(`/tokens?theme_id=${theme.id}`).then(rows => {
        const map = {};
        (rows ?? []).forEach(t => { map[t.name] = t.value; });
        setColorMap(map);
        injectCss(buildCss(map));
      });
    }).catch(() => {});
  }, []);
  return colorMap;
}
function tokenHelpers(colorMap) {
  const get     = (name) => colorMap[`color.${name}`] || null;
  const rgb     = (name) => { const v = get(name); return v ? hexToRgb(v) : null; };
  const bgStyle = (name) => { const v = get(name); return v ? { backgroundColor: v, color: '#fff', borderColor: v } : {}; };
  const softStyle = (name) => { const r = rgb(name); return r ? { backgroundColor: `rgba(${r},0.12)`, color: get(name) } : {}; };
  return { get, bgStyle, softStyle };
}

// ── Shared OffcanvasBody content ──────────────────────────────────────────────
const SampleBody = () => (
  <>
    <p className="text-muted">Some text as placeholder. You can put anything here: text, images, lists, etc.</p>
    <h6 className="mt-3">List</h6>
    <ul className="ps-3 text-muted">
      <li>Nemo enim ipsam voluptatem quia aspernatur</li>
      <li>Neque porro quisquam est, qui dolorem</li>
      <li>Quis autem vel eum iure qui in ea</li>
      <li>At vero eos et accusamus et iusto odio</li>
    </ul>
  </>
);

// ── Data ──────────────────────────────────────────────────────────────────────
const backdropOptions = [
  { name: 'Enable body scrolling',            scroll: true,  backdrop: false, token: 'primary'   },
  { name: 'Enable backdrop (default)',         scroll: false, backdrop: true,  token: 'secondary' },
  { name: 'Enable both scrolling & backdrop', scroll: true,  backdrop: true,  token: 'success'   },
];

const placementOptions = [
  { label: 'Left',   placement: 'start',  token: 'primary',   icon: 'panel-left'  },
  { label: 'Right',  placement: 'end',    token: 'secondary', icon: 'panel-right' },
  { label: 'Top',    placement: 'top',    token: 'success',   icon: 'panel-top'   },
  { label: 'Bottom', placement: 'bottom', token: 'info',      icon: 'panel-bottom'},
];

const colorVariants = [
  { label: 'Primary', token: 'primary', headerCls: 'bg-primary text-white', closeWhite: true  },
  { label: 'Success', token: 'success', headerCls: 'bg-success text-white', closeWhite: true  },
  { label: 'Danger',  token: 'danger',  headerCls: 'bg-danger text-white',  closeWhite: true  },
  { label: 'Warning', token: 'warning', headerCls: 'bg-warning',            closeWhite: false },
  { label: 'Info',    token: 'info',    headerCls: 'bg-info text-white',    closeWhite: true  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
const Page = () => {
  const colorMap = useColorTokens();
  const tokens   = tokenHelpers(colorMap);

  return <>
    <PageBreadcrumb title="Offcanvas" subtitle="UI" />
    <Row className="g-4">
      <Col xl={6}><DefaultOffcanvas tokens={tokens} /></Col>
      <Col xl={6}><OffcanvasBackdrop tokens={tokens} /></Col>
      <Col xl={6}><OffcanvasPlacement tokens={tokens} /></Col>
      <Col xl={6}><DarkOffcanvas tokens={tokens} /></Col>
      <Col xl={6}><ColoredOffcanvas tokens={tokens} /></Col>
      <Col xl={6}><OffcanvasWithNav tokens={tokens} /></Col>
      <Col xs={12}><GlobalOffcanvasDemo tokens={tokens} /></Col>
    </Row>
  </>;
};
export default Page;

// ── Default Offcanvas ─────────────────────────────────────────────────────────
const DefaultOffcanvas = ({ tokens }) => {
  const [show, toggle] = useToggle(false);
  return (
    <Card>
      <CardHeader>
        <div className="flex-grow-1"><CardTitle as="h4">Default Offcanvas</CardTitle></div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          Trigger an offcanvas using a button. React-Bootstrap manages the toggle via the <code>show</code> prop and <code>onHide</code> callback.
        </p>
        <div className="d-flex flex-wrap gap-2">
          <Button className="btn btn-primary" style={tokens.bgStyle('primary')} onClick={toggle}>
            <Icon icon="layout-sidebar" className="me-1" size={15} /> Open Offcanvas
          </Button>
        </div>

        <Offcanvas show={show} onHide={toggle} placement="start">
          <OffcanvasHeader closeButton>
            <OffcanvasTitle>Offcanvas</OffcanvasTitle>
          </OffcanvasHeader>
          <OffcanvasBody><SampleBody /></OffcanvasBody>
        </Offcanvas>
      </CardBody>
    </Card>
  );
};

// ── Backdrop Options ──────────────────────────────────────────────────────────
const BackdropItem = ({ name, token, scroll, backdrop, tokens }) => {
  const [show, toggle] = useToggle(false);
  return (
    <>
      <Button
        className="btn btn-primary"
        style={tokens.bgStyle(token)}
        onClick={toggle}
      >
        {name}
      </Button>
      <Offcanvas placement="start" show={show} onHide={toggle} scroll={scroll} backdrop={backdrop}>
        <OffcanvasHeader closeButton>
          <OffcanvasTitle as="h5">{name}</OffcanvasTitle>
        </OffcanvasHeader>
        <OffcanvasBody><SampleBody /></OffcanvasBody>
      </Offcanvas>
    </>
  );
};

const OffcanvasBackdrop = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1"><CardTitle as="h4">Backdrop Options</CardTitle></div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Use <code>scroll</code> to enable body scrolling and <code>backdrop</code> to control the backdrop.
      </p>
      <div className="d-flex flex-wrap gap-2">
        {backdropOptions.map((opt, i) => (
          <BackdropItem key={i} {...opt} tokens={tokens} />
        ))}
      </div>
    </CardBody>
  </Card>
);

// ── Placement ─────────────────────────────────────────────────────────────────
const PlacementItem = ({ label, placement, token, icon, tokens }) => {
  const [show, toggle] = useToggle(false);
  return (
    <>
      <Button
        className="btn btn-primary"
        style={tokens.bgStyle(token)}
        onClick={toggle}
      >
        <Icon icon={icon} className="me-1" size={15} /> {label}
      </Button>
      <Offcanvas show={show} onHide={toggle} placement={placement}>
        <OffcanvasHeader closeButton>
          <OffcanvasTitle as="h5">Offcanvas {label}</OffcanvasTitle>
        </OffcanvasHeader>
        <OffcanvasBody><SampleBody /></OffcanvasBody>
      </Offcanvas>
    </>
  );
};

const OffcanvasPlacement = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1"><CardTitle as="h4">Placement</CardTitle></div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        <code>start</code> = left, <code>end</code> = right, <code>top</code> = top, <code>bottom</code> = bottom of viewport.
      </p>
      <div className="d-flex flex-wrap gap-2">
        {placementOptions.map((opt, i) => (
          <PlacementItem key={i} {...opt} tokens={tokens} />
        ))}
      </div>
    </CardBody>
  </Card>
);

// ── Dark Offcanvas ────────────────────────────────────────────────────────────
const DarkOffcanvas = ({ tokens }) => {
  const [show, toggle] = useToggle(false);
  return (
    <Card>
      <CardHeader>
        <div className="flex-grow-1"><CardTitle as="h4">Dark Offcanvas</CardTitle></div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          Add <code>.text-bg-dark</code> to <code>.offcanvas</code> and <code>.btn-close-white</code> for dark styling.
        </p>
        <Button className="btn btn-dark" style={tokens.bgStyle('dark')} onClick={toggle}>
          <Icon icon="moon" className="me-1" size={15} /> Dark Offcanvas
        </Button>

        <Offcanvas show={show} onHide={toggle} placement="start" className="text-bg-dark">
          <OffcanvasHeader>
            <OffcanvasTitle>Dark Offcanvas</OffcanvasTitle>
            <button className="btn-close btn-close-white ms-auto" onClick={toggle} aria-label="Close" />
          </OffcanvasHeader>
          <OffcanvasBody><SampleBody /></OffcanvasBody>
        </Offcanvas>
      </CardBody>
    </Card>
  );
};

// ── Colored Offcanvas ─────────────────────────────────────────────────────────
const ColoredItem = ({ label, token, headerCls, closeWhite, tokens }) => {
  const [show, toggle] = useToggle(false);
  return (
    <>
      <Button
        className="btn btn-primary"
        style={tokens.softStyle(token)}
        onClick={toggle}
      >
        {label}
      </Button>
      <Offcanvas show={show} onHide={toggle} placement="end">
        <OffcanvasHeader className={headerCls}>
          <OffcanvasTitle>{label} Offcanvas</OffcanvasTitle>
          <button
            className={`btn-close ms-auto ${closeWhite ? 'btn-close-white' : ''}`}
            onClick={toggle}
            aria-label="Close"
          />
        </OffcanvasHeader>
        <OffcanvasBody><SampleBody /></OffcanvasBody>
      </Offcanvas>
    </>
  );
};

const ColoredOffcanvas = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1"><CardTitle as="h4">Colored Header</CardTitle></div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Customize offcanvas headers with token-driven background colors.
      </p>
      <div className="d-flex flex-wrap gap-2">
        {colorVariants.map((v, i) => (
          <ColoredItem key={i} {...v} tokens={tokens} />
        ))}
      </div>
    </CardBody>
  </Card>
);

// ── Offcanvas with Nav ────────────────────────────────────────────────────────
const OffcanvasWithNav = ({ tokens }) => {
  const [show, toggle] = useToggle(false);
  const navItems = [
    { icon: 'home',        label: 'Dashboard'  },
    { icon: 'users',       label: 'Users'       },
    { icon: 'shopping-bag',label: 'Orders'      },
    { icon: 'bar-chart-2', label: 'Analytics'   },
    { icon: 'settings',    label: 'Settings'    },
  ];
  return (
    <Card>
      <CardHeader>
        <div className="flex-grow-1"><CardTitle as="h4">Offcanvas with Navigation</CardTitle></div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          Use offcanvas as a side drawer with navigation links — great for mobile menus.
        </p>
        <Button className="btn btn-primary" style={tokens.bgStyle('primary')} onClick={toggle}>
          <Icon icon="menu" className="me-1" size={15} /> Open Drawer
        </Button>

        <Offcanvas show={show} onHide={toggle} placement="start" style={{ maxWidth: 260 }}>
          <OffcanvasHeader style={tokens.bgStyle('primary')}>
            <OffcanvasTitle className="text-white">Navigation</OffcanvasTitle>
            <button className="btn-close btn-close-white ms-auto" onClick={toggle} aria-label="Close" />
          </OffcanvasHeader>
          <OffcanvasBody className="p-0">
            <nav>
              <ul className="list-unstyled mb-0">
                {navItems.map((item, i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="d-flex align-items-center gap-3 px-4 py-3 text-body text-decoration-none border-bottom"
                      style={{ transition: 'background .15s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                      onClick={e => e.preventDefault()}
                    >
                      <Icon icon={item.icon} size={17} />
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </OffcanvasBody>
        </Offcanvas>
      </CardBody>
    </Card>
  );
};

// ── Global openOffcanvas() Demo ───────────────────────────────────────────────
const GlobalOffcanvasDemo = ({ tokens }) => {
  const { showOffcanvas } = useOffcanvasContext();

  const demos = [
    {
      label: 'Left (start)',
      token: 'primary',
      fn: () => openOffcanvas.start('Left Panel', 'Opened from anywhere using openOffcanvas.start()'),
    },
    {
      label: 'Right (end)',
      token: 'secondary',
      fn: () => openOffcanvas.end('Right Panel', 'Opened from anywhere using openOffcanvas.end()'),
    },
    {
      label: 'Top',
      token: 'success',
      fn: () => openOffcanvas.top('Top Panel', 'Opened from anywhere using openOffcanvas.top()'),
    },
    {
      label: 'Bottom',
      token: 'info',
      fn: () => openOffcanvas.bottom('Bottom Panel', 'Opened from anywhere using openOffcanvas.bottom()'),
    },
    {
      label: 'Primary variant',
      token: 'primary',
      fn: () => openOffcanvas({ title: 'Primary Offcanvas', body: 'Colored header via variant option.', variant: 'primary' }),
    },
    {
      label: 'Success variant',
      token: 'success',
      fn: () => openOffcanvas({ title: 'Success Offcanvas', body: 'Colored header via variant option.', variant: 'success' }),
    },
    {
      label: 'Dark variant',
      token: 'dark',
      fn: () => openOffcanvas({ title: 'Dark Offcanvas', body: 'Dark header via variant option.', variant: 'dark' }),
    },
    {
      label: 'With scroll + no backdrop',
      token: 'warning',
      fn: () => openOffcanvas({ title: 'Scrollable', body: 'Body scroll is enabled, no backdrop.', scroll: true, backdrop: false }),
    },
  ];

  const ctxDemos = [
    {
      label: 'ctx.showOffcanvas()',
      token: 'primary',
      fn: () => showOffcanvas({
        title: 'Via Context Hook',
        body: 'Called with useOffcanvasContext() inside a React component.',
        placement: 'end',
        variant: 'primary',
      }),
    },
    {
      label: 'With JSX body',
      token: 'info',
      fn: () => showOffcanvas({
        title: 'Rich Content',
        placement: 'end',
        variant: 'info',
        body: (
          <div>
            <p className="text-muted">Pass any JSX as the body via context hook.</p>
            <div className="d-flex gap-2 mt-3">
              <span className="badge bg-primary">Badge</span>
              <span className="badge bg-success">Badge</span>
              <span className="badge bg-danger">Badge</span>
            </div>
          </div>
        ),
      }),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4">Global <code>openOffcanvas()</code> — Call from Anywhere</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-muted mb-1">
          Import <code>openOffcanvas</code> from <code>@admin/utils/offcanvas</code> and call it from any file.
        </p>
        <pre className="bg-light rounded p-3 mb-4" style={{ fontSize: 13 }}>{`import { openOffcanvas } from '@admin/utils/offcanvas';

openOffcanvas.start('Panel Title', 'Body text here');
openOffcanvas.end('Right Panel', 'Content here');
openOffcanvas.top('Top Panel', 'Content here');
openOffcanvas.bottom('Bottom', 'Content here');

// With options:
openOffcanvas({
  title: 'Details',
  body: 'Any string content',
  placement: 'end',         // start | end | top | bottom
  variant: 'primary',       // colored header
  scroll: true,             // enable body scroll
  backdrop: false,          // disable backdrop
});`}</pre>

        <p className="text-muted mb-3">Click to trigger:</p>
        <div className="d-flex flex-wrap gap-2 mb-4">
          {demos.map(d => (
            <Button
              key={d.label}
              size="sm"
              className="btn btn-primary"
              style={tokens.bgStyle(d.token)}
              onClick={d.fn}
            >
              {d.label}
            </Button>
          ))}
        </div>

        <hr className="my-4" />
        <p className="text-muted mb-2">
          Or use <code>useOffcanvasContext</code> inside React components (supports JSX body):
        </p>
        <pre className="bg-light rounded p-3 mb-3" style={{ fontSize: 13 }}>{`import { useOffcanvasContext } from '@admin/context/useOffcanvasContext';

const { showOffcanvas } = useOffcanvasContext();
showOffcanvas({
  title: 'Panel',
  body: <MyComponent />,   // ← JSX supported!
  placement: 'end',
  variant: 'primary',
});`}</pre>
        <div className="d-flex flex-wrap gap-2">
          {ctxDemos.map(d => (
            <Button
              key={d.label}
              size="sm"
              className="btn btn-primary"
              style={tokens.bgStyle(d.token)}
              onClick={d.fn}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};
