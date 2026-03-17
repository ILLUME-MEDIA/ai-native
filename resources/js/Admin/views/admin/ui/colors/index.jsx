import { useState, useEffect } from 'react';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Link } from 'react-router';
import { Card, CardBody, CardHeader, CardTitle, Col, Row, Table } from 'react-bootstrap';

// ── Design Tokens API ─────────────────────────────────────────────────────────
const DS_API = '/api/admin/design-system';

function apiCall(path) {
  return fetch(DS_API + path, {
    headers: { Accept: 'application/json' },
  }).then(r => r.json());
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

// ── Color config ──────────────────────────────────────────────────────────────
const COLOR_NAMES = [
  { key: 'primary',   label: 'Primary',   opacity: 'bg-opacity-25' },
  { key: 'secondary', label: 'Secondary', opacity: 'bg-opacity-50' },
  { key: 'success',   label: 'Success',   opacity: 'bg-opacity-75' },
  { key: 'info',      label: 'Info',      opacity: 'bg-opacity-10' },
  { key: 'warning',   label: 'Warning',   opacity: 'bg-opacity-25' },
  { key: 'danger',    label: 'Danger',    opacity: 'bg-opacity-50' },
  { key: 'light',     label: 'Light',     opacity: 'bg-opacity-75' },
  { key: 'dark',      label: 'Dark',      opacity: 'bg-opacity-10' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
const Page = () => {
  const { colorMap, loading } = useColorTokens();

  return <>
    <PageBreadcrumb title="Colors" subtitle="UI" />

    {/* Top color swatches */}
    <Row>
      {COLOR_NAMES.map(c => (
        <ColorCard
          key={c.key}
          label={c.label}
          hex={colorMap[`color.${c.key}`]}
        />
      ))}
    </Row>

    <Row>
      <Col xs={12}>
        <BackgroundColors colorMap={colorMap} />
      </Col>
    </Row>

    <Row>
      <Col xs={12}>
        <TextColorsAndLinkColors />
      </Col>
    </Row>

    <Row>
      <Col xs={12}>
        <h4 className="my-4 fw-bold">Border Colors</h4>
      </Col>
    </Row>
    <Row>
      <Col xs={6}><AdditiveBorder /></Col>
      <Col xs={6}><SubtractiveBorder /></Col>
    </Row>
    <Row>
      <Col xs={6}>
        <BorderColor />
        <BorderWidthSize />
        <BorderSubtleColor />
      </Col>
      <Col xs={6}>
        <BorderOpacity />
      </Col>
    </Row>
  </>;
};
export default Page;

// ── Color Card ────────────────────────────────────────────────────────────────
const ColorCard = ({ label, hex }) => {
  return (
    <Col md={4} xl={2}>
      <Card>
        <CardBody>
          <div
            className="rounded"
            style={{ height: 100, backgroundColor: hex || '#e9ecef' }}
          />
          <div className="mt-2 text-center">
            <h6 className="fs-sm mb-0">{label}</h6>
            <code className="text-muted" style={{ fontSize: 10 }}>
              {hex || '—'}
            </code>
          </div>
        </CardBody>
      </Card>
    </Col>
  );
};

// ── Background Colors ─────────────────────────────────────────────────────────
const BackgroundColors = ({ colorMap }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex-grow-1">
          <CardTitle as="h4">Background Colors</CardTitle>
        </div>
      </CardHeader>
      <CardBody>
        <div className="table-responsive">
          <Table className="table-bordered table-striped align-middle mb-0">
            <thead>
              <tr className="text-center">
                <th scope="col" className="align-middle">Name</th>
                <th scope="col" colSpan={2} className="align-middle">Background<br />Color</th>
                <th scope="col" colSpan={2} className="align-middle">Background<br />Subtle</th>
                <th scope="col" colSpan={2} className="align-middle">Background<br />Gradient</th>
                <th scope="col" colSpan={2} className="align-middle">Background<br />Opacity</th>
              </tr>
            </thead>
            <tbody>
              {COLOR_NAMES.map((item) => {
                const hex = colorMap[`color.${item.key}`];
                const rgb = hex ? hexToRgb(hex) : null;
                const subtleBg = rgb ? `rgba(${rgb},0.15)` : undefined;
                return (
                  <tr key={item.key}>
                    <th>{item.label}</th>
                    <td style={{ width: 180 }}>
                      <code>.bg-{item.key}</code>
                    </td>
                    <td style={{ width: 80 }}>
                      <div style={{ height: 24, backgroundColor: hex || '#e9ecef', borderRadius: 3 }} />
                    </td>
                    <td style={{ width: 180 }}>
                      <code>.bg-{item.key}-subtle</code>
                    </td>
                    <td style={{ width: 80 }}>
                      <div style={{ height: 24, backgroundColor: subtleBg || '#f8f9fa', borderRadius: 3 }} />
                    </td>
                    <td style={{ width: 180 }}>
                      <code>.bg-{item.key}<br />.bg-gradient</code>
                    </td>
                    <td style={{ width: 80 }}>
                      <div style={{
                        height: 24,
                        borderRadius: 3,
                        background: hex
                          ? `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0) 100%), ${hex}`
                          : '#e9ecef'
                      }} />
                    </td>
                    <td style={{ width: 180 }}>
                      <code>.bg-{item.key}<br />.{item.opacity}</code>
                    </td>
                    <td style={{ width: 80 }}>
                      <div style={{
                        height: 24,
                        borderRadius: 3,
                        backgroundColor: rgb
                          ? `rgba(${rgb}, ${item.opacity === 'bg-opacity-25' ? 0.25 : item.opacity === 'bg-opacity-50' ? 0.5 : item.opacity === 'bg-opacity-75' ? 0.75 : 0.1})`
                          : '#e9ecef'
                      }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
};

// ── Text Colors & Link Colors ─────────────────────────────────────────────────
const TextColorsAndLinkColors = () => {
  return (
    <Card className="mb-0">
      <CardHeader>
        <CardTitle as="h4">Text Colors & Link Colors</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="table-responsive">
          <Table className="table-bordered align-middle table-striped mb-0">
            <thead>
              <tr className="text-center">
                <th scope="col" className="align-middle">Name</th>
                <th scope="col" colSpan={2} className="align-middle">Text Color</th>
                <th scope="col" colSpan={2} className="align-middle">Text Emphasis</th>
                <th scope="col" colSpan={2} className="align-middle">Text Opacity</th>
                <th scope="col" colSpan={2} className="align-middle">Link Color</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Primary</th>
                <td><code>.text-primary</code></td>
                <td><div className="text-primary">Primary Color Text</div></td>
                <td><code>.text-primary-emphasis</code></td>
                <td><div className="text-primary-emphasis">Primary Emphasis Text</div></td>
                <td><code>.text-primary<br />.text-opacity-50</code></td>
                <td><div className="text-primary text-opacity-50">Primary Color Text</div></td>
                <td><code>.link-primary</code></td>
                <td><Link to="" className="link-primary">Primary Link</Link></td>
              </tr>
              <tr>
                <th>Secondary</th>
                <td><code>.text-secondary</code></td>
                <td><div className="text-secondary">Secondary Color Text</div></td>
                <td><code>.text-secondary-emphasis</code></td>
                <td><div className="text-secondary-emphasis">Secondary Emphasis Text</div></td>
                <td><code>.text-secondary<br />.text-opacity-75</code></td>
                <td><div className="text-secondary text-opacity-75">Secondary Color Text</div></td>
                <td><code>.link-secondary</code></td>
                <td><Link to="" className="link-secondary">Secondary Link</Link></td>
              </tr>
              <tr>
                <th>Success</th>
                <td><code>.text-success</code></td>
                <td><div className="text-success">Success Color Text</div></td>
                <td><code>.text-success-emphasis</code></td>
                <td><div className="text-success-emphasis">Success Emphasis Text</div></td>
                <td><code>.text-success<br />.text-opacity-25</code></td>
                <td><div className="text-success text-opacity-25">Success Color Text</div></td>
                <td><code>.link-success</code></td>
                <td><Link to="" className="link-success">Success Link</Link></td>
              </tr>
              <tr>
                <th>Info</th>
                <td><code>.text-info</code></td>
                <td><div className="text-info">Info Color Text</div></td>
                <td><code>.text-info-emphasis</code></td>
                <td><div className="text-info-emphasis">Info Emphasis Text</div></td>
                <td><code>.text-info<br />.text-opacity-50</code></td>
                <td><div className="text-info text-opacity-50">Info Color Text</div></td>
                <td><code>.link-info</code></td>
                <td><Link to="" className="link-info">Info Link</Link></td>
              </tr>
              <tr>
                <th>Danger</th>
                <td><code>.text-danger</code></td>
                <td><div className="text-danger">Danger Color Text</div></td>
                <td><code>.text-danger-emphasis</code></td>
                <td><div className="text-danger-emphasis">Danger Emphasis Text</div></td>
                <td><code>.text-danger<br />.text-opacity-25</code></td>
                <td><div className="text-danger text-opacity-25">Danger Color Text</div></td>
                <td><code>.link-danger</code></td>
                <td><Link to="" className="link-danger">Danger Link</Link></td>
              </tr>
              <tr>
                <th>Warning</th>
                <td><code>.text-warning</code></td>
                <td><div className="text-warning">Warning Color Text</div></td>
                <td><code>.text-warning-emphasis</code></td>
                <td><div className="text-warning-emphasis">Warning Emphasis Text</div></td>
                <td><code>.text-warning<br />.text-opacity-75</code></td>
                <td><div className="text-warning text-opacity-75">Warning Color Text</div></td>
                <td><code>.link-warning</code></td>
                <td><Link to="" className="link-warning">Warning Link</Link></td>
              </tr>
              <tr>
                <th>Purple</th>
                <td><code>.text-purple</code></td>
                <td><div className="text-purple">Purple Color Text</div></td>
                <td><code>.text-purple-emphasis</code></td>
                <td><div className="text-purple-emphasis">Purple Emphasis Text</div></td>
                <td><code>.text-purple<br />.text-opacity-25</code></td>
                <td><div className="text-purple text-opacity-25">Purple Color Text</div></td>
                <td><code>.link-purple</code></td>
                <td><Link to="" className="link-purple">Purple Link</Link></td>
              </tr>
              <tr>
                <th>Dark</th>
                <td><code>.text-dark</code></td>
                <td><div className="text-dark">Dark Color Text</div></td>
                <td><code>.text-dark-emphasis</code></td>
                <td><div className="text-dark-emphasis">Dark Emphasis Text</div></td>
                <td><code>.text-dark<br />.text-opacity-25</code></td>
                <td><div className="text-dark text-opacity-25">Dark Color Text</div></td>
                <td><code>.link-dark</code></td>
                <td><Link to="" className="link-dark">Dark Link</Link></td>
              </tr>
              <tr>
                <th>Light</th>
                <td><code>.text-light</code></td>
                <td><div className="text-light bg-dark">Light Color Text</div></td>
                <td><code>.text-light-emphasis</code></td>
                <td><div className="text-light-emphasis">Light Emphasis Text</div></td>
                <td><code>.text-light<br />.text-opacity-50</code></td>
                <td><div className="text-light text-opacity-50 bg-dark">Light Color Text</div></td>
                <td><code>.link-light</code></td>
                <td><Link to="" className="link-light bg-dark">Light Link</Link></td>
              </tr>
              <tr>
                <th>Body</th>
                <td><code>.text-body</code></td>
                <td><div className="text-body">Body Color Text</div></td>
                <td><code>.text-body-emphasis</code></td>
                <td><div className="text-body-emphasis">Body Emphasis Text</div></td>
                <td>-</td><td>-</td><td>-</td><td>-</td>
              </tr>
              <tr>
                <th>Body</th>
                <td><code>.text-body-secondary</code></td>
                <td><div className="text-body-secondary">Body Secondary Color</div></td>
                <td><code>.text-body-tertiary</code></td>
                <td><div className="text-body-tertiary">Body Tertiary Text</div></td>
                <td>-</td><td>-</td><td>-</td><td>-</td>
              </tr>
              <tr>
                <th>Black</th>
                <td><code>.text-black</code></td>
                <td><div className="text-black">Black Color Text</div></td>
                <td><code>.text-black-50</code></td>
                <td><div className="text-black-50">Black 50% Text</div></td>
                <td>-</td><td>-</td><td>-</td><td>-</td>
              </tr>
              <tr>
                <th>White</th>
                <td><code>.text-white</code></td>
                <td><div className="text-white bg-dark">White Color Text</div></td>
                <td><code>.text-white-50</code></td>
                <td><div className="text-white-50 bg-dark">White 50% Text</div></td>
                <td>-</td><td>-</td><td>-</td><td>-</td>
              </tr>
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
};

// ── Border sections ───────────────────────────────────────────────────────────
const AdditiveBorder = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Additive(Add) Border</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Use border utilities to <b>add</b> an element's borders. Choose from all borders or one at a time.</p>
      <div className="d-flex align-items-start flex-wrap gap-4">
        <div className="border avatar-md bg-light bg-opacity-50" />
        <div className="border-top avatar-md bg-light bg-opacity-50" />
        <div className="border-end avatar-md bg-light bg-opacity-50" />
        <div className="border-bottom avatar-md bg-light bg-opacity-50" />
        <div className="border-start avatar-md bg-light bg-opacity-50" />
      </div>
    </CardBody>
  </Card>
);

const SubtractiveBorder = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Subtractive(Remove) Border</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Use border utilities to <b>remove</b> an element's borders. Choose from all borders or one at a time.</p>
      <div className="d-flex align-items-start flex-wrap gap-4">
        <div className="border-0 avatar-md bg-light bg-opacity-50" />
        <div className="border border-top-0 avatar-md bg-light bg-opacity-50" />
        <div className="border border-end-0 avatar-md bg-light bg-opacity-50" />
        <div className="border border-bottom-0 avatar-md bg-light bg-opacity-50" />
        <div className="border border-start-0 avatar-md bg-light bg-opacity-50" />
      </div>
    </CardBody>
  </Card>
);

const BorderColor = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Border Color</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Change the border color using utilities built on our theme colors.</p>
      <div className="d-flex align-items-start flex-wrap gap-2">
        {['primary','secondary','success','danger','warning','info'].map(c => (
          <div key={c} className={`border border-${c} avatar-md bg-light bg-opacity-50`} />
        ))}
        <div className="border border-light avatar-md" />
        <div className="border border-dark avatar-md bg-light bg-opacity-50" />
      </div>
    </CardBody>
  </Card>
);

const BorderWidthSize = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Border Width Size</CardTitle></CardHeader>
    <CardBody>
      <div className="d-flex align-items-start flex-wrap gap-2">
        {[1,2,3,4,5].map(n => (
          <div key={n} className={`border border-${n} avatar-md bg-light bg-opacity-50`} />
        ))}
      </div>
    </CardBody>
  </Card>
);

const BorderSubtleColor = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Border Subtle Color</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">Change the border color using utilities built on our theme colors.</p>
      <div className="d-flex align-items-start flex-wrap gap-2">
        {['primary','secondary','success','danger','warning','info'].map(c => (
          <div key={c} className={`border border-${c}-subtle avatar-md bg-light bg-opacity-50`} />
        ))}
        <div className="border border-light-subtle avatar-md" />
        <div className="border border-dark-subtle avatar-md bg-light bg-opacity-50" />
      </div>
    </CardBody>
  </Card>
);

const BorderOpacity = () => (
  <Card>
    <CardHeader><CardTitle as="h4">Border Opacity</CardTitle></CardHeader>
    <CardBody>
      <p className="text-muted">choose from any of the <code>.border-opacity</code> utilities:</p>
      <div className="border border-primary p-2 mb-2">This is default accent border</div>
      <div className="border border-primary p-2 mb-2 border-opacity-75">This is 75% opacity accent border</div>
      <div className="border border-primary p-2 mb-2 border-opacity-50">This is 50% opacity accent border</div>
      <div className="border border-primary p-2 mb-2 border-opacity-25">This is 25% opacity accent border</div>
      <div className="border border-primary p-2 border-opacity-10">This is 10% opacity accent border</div>
    </CardBody>
  </Card>
);
