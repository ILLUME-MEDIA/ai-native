import { useState, useEffect } from 'react';
import logoSm from '@admin/assets/images/logo-sm.png';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { useNotificationContext } from '@admin/context/useNotificationContext';
import { notify } from '@admin/utils/notify';
import {
  Button, Card, CardBody, CardHeader, CardTitle,
  Col, Form, FormSelect, Row,
  Toast, ToastBody, ToastContainer, ToastHeader,
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
  const get = (name) => colorMap[`color.${name}`] || null;
  const rgb = (name) => { const v = get(name); return v ? hexToRgb(v) : null; };
  const bgStyle   = (name) => { const v = get(name); return v ? { backgroundColor: v, color: '#fff', borderColor: v } : {}; };
  const softStyle = (name) => { const r = rgb(name); return r ? { backgroundColor: `rgba(${r},0.12)`, color: get(name) } : {}; };
  return { get, bgStyle, softStyle };
}

// ── Variant definitions ───────────────────────────────────────────────────────
const VARIANTS = [
  { key: 'primary', label: 'Primary',  icon: 'bell',           textWhite: true  },
  { key: 'success', label: 'Success',  icon: 'check-circle',   textWhite: true  },
  { key: 'danger',  label: 'Danger',   icon: 'x-circle',       textWhite: true  },
  { key: 'warning', label: 'Warning',  icon: 'alert-triangle', textWhite: false },
  { key: 'info',    label: 'Info',     icon: 'info',           textWhite: true  },
  { key: 'dark',    label: 'Dark',     icon: 'bell',           textWhite: true  },
  { key: 'light',   label: 'Light',    icon: 'bell',           textWhite: false },
];

const POSITIONS = [
  'top-start', 'top-center', 'top-end',
  'middle-start', 'middle-center', 'middle-end',
  'bottom-start', 'bottom-center', 'bottom-end',
];

// ── Page ──────────────────────────────────────────────────────────────────────
const Page = () => {
  const colorMap = useColorTokens();
  const tokens   = tokenHelpers(colorMap);

  return <>
    <PageBreadcrumb title="Notifications" subtitle="UI" />
    <Row className="g-4">
      <Col lg={6}><BasicToast tokens={tokens} /></Col>
      <Col lg={6}><LiveToastDemo tokens={tokens} /></Col>
      <Col lg={6}><VariantToasts tokens={tokens} /></Col>
      <Col lg={6}><CustomContent tokens={tokens} /></Col>
      <Col lg={6}><StackingToasts tokens={tokens} /></Col>
      <Col lg={6}><PlacementSelector tokens={tokens} /></Col>
      <Col xs={12}><GlobalNotifyDemo tokens={tokens} /></Col>
    </Row>
  </>;
};
export default Page;

// ── Basic Toast ───────────────────────────────────────────────────────────────
const BasicToast = ({ tokens }) => {
  const [show, toggle] = useToggle(true);
  return (
    <Card>
      <CardHeader>
        <div className="flex-grow-1"><CardTitle as="h4">Basic Toast</CardTitle></div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          At a minimum, a single element to contain your &quot;toasted&quot; content and a dismiss button.
        </p>
        <Button
          className="btn btn-primary mb-3"
          style={tokens.bgStyle('primary')}
          onClick={toggle}
        >
          {show ? 'Hide' : 'Show'} Toast
        </Button>
        <div className="p-3 bg-light bg-opacity-50 rounded" style={{ minHeight: 100 }}>
          <Toast className="fade" show={show} onClose={toggle}>
            <ToastHeader>
              <img src={logoSm} alt="brand-logo" height="16" className="me-1" />
              <strong className="me-auto text-body">BRAND</strong>
              <small>just now</small>
            </ToastHeader>
            <ToastBody>Hello, world! This is a toast message.</ToastBody>
          </Toast>
        </div>
      </CardBody>
    </Card>
  );
};

// ── Live Toast ────────────────────────────────────────────────────────────────
const LiveToastDemo = ({ tokens }) => {
  const [show, toggle] = useToggle(false);
  return (
    <Card>
      <CardHeader>
        <div className="flex-grow-1"><CardTitle as="h4">Live Toast</CardTitle></div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          Click the button below to show a toast positioned in the top-right corner. Auto-hides after 3s.
        </p>
        <Button
          className="btn btn-success"
          style={tokens.bgStyle('success')}
          onClick={toggle}
        >
          <Icon icon="bell" className="me-1" size={15} /> Show Live Toast
        </Button>
        <ToastContainer className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
          <Toast onClose={toggle} show={show} delay={3000} autohide bg="success">
            <ToastHeader className="text-white border-0 bg-transparent">
              <Icon icon="check-circle" className="me-2 text-white" size={15} />
              <strong className="me-auto text-white">Success</strong>
              <small className="text-white-50">just now</small>
            </ToastHeader>
            <ToastBody className="text-white">
              Action completed successfully!
            </ToastBody>
          </Toast>
        </ToastContainer>
      </CardBody>
    </Card>
  );
};

// ── Variant Toasts ────────────────────────────────────────────────────────────
const VariantToasts = ({ tokens }) => {
  const [visible, setVisible] = useState(
    Object.fromEntries(VARIANTS.map(v => [v.key, true]))
  );
  const hide = (key) => setVisible(p => ({ ...p, [key]: false }));
  const showAll = () => setVisible(Object.fromEntries(VARIANTS.map(v => [v.key, true])));

  return (
    <Card>
      <CardHeader className="d-flex align-items-center justify-content-between">
        <CardTitle as="h4" className="mb-0">Variant Toasts</CardTitle>
        <Button size="sm" variant="outline-secondary" onClick={showAll}>Reset All</Button>
      </CardHeader>
      <CardBody>
        <p className="text-muted">All color variants — token-driven colors applied automatically.</p>
        {VARIANTS.map(v => (
          <Toast
            key={v.key}
            bg={v.key}
            show={visible[v.key]}
            onClose={() => hide(v.key)}
            className="mb-2"
          >
            <ToastBody className={`d-flex align-items-center gap-2 ${v.textWhite ? 'text-white' : ''}`}>
              <Icon icon={v.icon} size={16} className="flex-shrink-0" />
              <span className="fw-semibold me-1">{v.label}:</span>
              <span>This is a {v.label.toLowerCase()} notification.</span>
              <button
                className={`btn-close ms-auto ${v.textWhite ? 'btn-close-white' : ''}`}
                onClick={() => hide(v.key)}
              />
            </ToastBody>
          </Toast>
        ))}
      </CardBody>
    </Card>
  );
};

// ── Custom Content ────────────────────────────────────────────────────────────
const CustomContent = ({ tokens }) => {
  const [s1, t1] = useToggle(true);
  const [s2, t2] = useToggle(true);
  const [s3, t3] = useToggle(true);
  return (
    <Card>
      <CardHeader>
        <div className="flex-grow-1"><CardTitle as="h4">Custom Content</CardTitle></div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          Customize toasts with close buttons, actions, and flexible layouts.
        </p>

        {/* Plain with close button */}
        <Toast show={s1} onClose={t1} className="align-items-center mb-2">
          <div className="d-flex">
            <ToastBody>Plain toast with close button.</ToastBody>
            <button className="btn-close me-2 m-auto" onClick={t1} />
          </div>
        </Toast>

        {/* Colored with close */}
        <Toast show={s2} onClose={t2} className="align-items-center text-white border-0 mb-2" bg="primary">
          <div className="d-flex">
            <ToastBody className="text-white d-flex align-items-center gap-2">
              <Icon icon="bell" size={15} className="flex-shrink-0" />
              Primary toast with white close button.
            </ToastBody>
            <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={t2} />
          </div>
        </Toast>

        {/* With action buttons */}
        <Toast show={s3} onClose={t3} className="mb-2" bg="warning">
          <ToastBody>
            <div className="d-flex align-items-center gap-2 mb-2">
              <Icon icon="alert-triangle" size={16} className="flex-shrink-0" />
              <span>Are you sure you want to proceed?</span>
            </div>
            <div className="d-flex gap-2 pt-2 border-top">
              <Button size="sm" className="btn-primary" style={tokens.bgStyle('primary')}>
                Confirm
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={t3}>
                Dismiss
              </Button>
            </div>
          </ToastBody>
        </Toast>
      </CardBody>
    </Card>
  );
};

// ── Stacking Toasts ───────────────────────────────────────────────────────────
const StackingToasts = ({ tokens }) => {
  const [s1, t1] = useToggle(true);
  const [s2, t2] = useToggle(true);
  const [s3, t3] = useToggle(true);
  const resetAll = () => { if (!s1) t1(); if (!s2) t2(); if (!s3) t3(); };
  return (
    <Card>
      <CardHeader className="d-flex align-items-center justify-content-between">
        <CardTitle as="h4" className="mb-0">Stacking</CardTitle>
        <Button size="sm" variant="outline-secondary" onClick={resetAll}>Reset</Button>
      </CardHeader>
      <CardBody>
        <p className="text-muted">Multiple toasts stack vertically in a readable manner.</p>
        <div style={{ position: 'relative', minHeight: 220 }}>
          <ToastContainer style={{ position: 'absolute', top: 0, right: 0 }}>
            <Toast show={s1} onClose={t1} className="fade mb-2" bg="primary">
              <ToastHeader className="text-white border-0 bg-transparent">
                <Icon icon="bell" className="me-2 text-white" size={14} />
                <strong className="me-auto text-white">Notification</strong>
                <small className="text-white-50">just now</small>
              </ToastHeader>
              <ToastBody className="text-white">First stacked toast message.</ToastBody>
            </Toast>
            <Toast show={s2} onClose={t2} className="fade mb-2" bg="success">
              <ToastHeader className="text-white border-0 bg-transparent">
                <Icon icon="check-circle" className="me-2 text-white" size={14} />
                <strong className="me-auto text-white">Success</strong>
                <small className="text-white-50">2s ago</small>
              </ToastHeader>
              <ToastBody className="text-white">Second stacked toast message.</ToastBody>
            </Toast>
            <Toast show={s3} onClose={t3} className="fade" bg="warning">
              <ToastBody className="d-flex align-items-center gap-2">
                <Icon icon="alert-triangle" size={15} />
                <span>Third stacked toast.</span>
                <button className="btn-close ms-auto" onClick={t3} />
              </ToastBody>
            </Toast>
          </ToastContainer>
        </div>
      </CardBody>
    </Card>
  );
};

// ── Placement Selector ────────────────────────────────────────────────────────
const PlacementSelector = ({ tokens }) => {
  const [position, setPosition] = useState('top-end');
  return (
    <Card>
      <CardHeader>
        <div className="flex-grow-1"><CardTitle as="h4">Placement</CardTitle></div>
      </CardHeader>
      <CardBody>
        <p className="text-muted">
          Select a position to preview toast placement within the container below.
        </p>
        <Form.Select
          className="mb-3"
          value={position}
          onChange={e => setPosition(e.currentTarget.value)}
          style={{ maxWidth: 240 }}
        >
          {POSITIONS.map(p => (
            <option key={p} value={p}>{p.replace('-', ' › ')}</option>
          ))}
        </Form.Select>
        <div
          className="bg-light rounded position-relative"
          aria-live="polite"
          aria-atomic="true"
          style={{ minHeight: 200 }}
        >
          <ToastContainer position={position} className="position-absolute p-3" id="toastPlacement">
            <Toast show>
              <ToastHeader closeButton={false}>
                <img className="me-1" src={logoSm} alt="logo" height={16} />
                <strong className="me-auto">BRAND</strong>
                <small>now</small>
              </ToastHeader>
              <ToastBody>Position: <code>{position}</code></ToastBody>
            </Toast>
          </ToastContainer>
        </div>
      </CardBody>
    </Card>
  );
};

// ── Global Notify Demo ────────────────────────────────────────────────────────
const GlobalNotifyDemo = ({ tokens }) => {
  const { notify: ctxNotify } = useNotificationContext();

  const demos = [
    { label: 'Success',  fn: () => notify.success('Record saved successfully!'),                    token: 'success', icon: 'check-circle'   },
    { label: 'Error',    fn: () => notify.error('Something went wrong. Please try again.'),         token: 'danger',  icon: 'x-circle'       },
    { label: 'Warning',  fn: () => notify.warning('Check your inputs before proceeding.'),          token: 'warning', icon: 'alert-triangle' },
    { label: 'Info',     fn: () => notify.info('Data is syncing in the background.'),               token: 'info',    icon: 'info'           },
    { label: 'Primary',  fn: () => notify.primary('Welcome back! You have 3 new messages.'),        token: 'primary', icon: 'bell'           },
    { label: 'Dark',     fn: () => notify.dark('Dark notification from anywhere.'),                 token: 'dark',    icon: 'bell'           },
    { label: 'With Title', fn: () => notify('File uploaded to server.', { title: 'Upload Complete', variant: 'success', delay: 4000 }),
                                                                                                     token: 'success', icon: 'upload'        },
    { label: 'Long Delay', fn: () => notify('This stays for 6 seconds.', { variant: 'info', delay: 6000 }),
                                                                                                     token: 'info',    icon: 'clock'         },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4">Global <code>notify()</code> — Call from Anywhere</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-muted mb-1">
          Import <code>notify</code> from <code>@admin/utils/notify</code> and call it from any file —
          components, API handlers, event listeners, outside React.
        </p>
        <pre className="bg-light rounded p-3 mb-4" style={{ fontSize: 13 }}>{`import { notify } from '@admin/utils/notify';

notify.success('Saved!');
notify.error('Failed!', { title: 'Error' });
notify.warning('Check inputs');
notify.info('Syncing...');
notify('Custom message', { variant: 'primary', delay: 5000 });`}</pre>

        <p className="text-muted mb-3">Click to trigger each variant:</p>
        <div className="d-flex flex-wrap gap-2">
          {demos.map(d => (
            <Button
              key={d.label}
              size="sm"
              className="btn btn-primary"
              style={tokens.bgStyle(d.token)}
              onClick={d.fn}
            >
              <Icon icon={d.icon} className="me-1" size={14} />
              {d.label}
            </Button>
          ))}
        </div>

        <hr className="my-4" />

        <p className="text-muted mb-3">
          Or use <code>useNotificationContext</code> inside React components:
        </p>
        <pre className="bg-light rounded p-3 mb-3" style={{ fontSize: 13 }}>{`import { useNotificationContext } from '@admin/context/useNotificationContext';

const { notify } = useNotificationContext();
notify({ message: 'Hello!', variant: 'success', title: 'Done' });`}</pre>

        <div className="d-flex flex-wrap gap-2">
          {VARIANTS.slice(0, 5).map(v => (
            <Button
              key={v.key}
              size="sm"
              className="btn btn-primary"
              style={tokens.bgStyle(v.key)}
              onClick={() => ctxNotify({ message: `${v.label} via context hook!`, variant: v.key, title: v.label })}
            >
              <Icon icon={v.icon} className="me-1" size={14} />
              ctx.{v.key}
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};
