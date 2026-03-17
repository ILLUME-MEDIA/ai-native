import { useState, useEffect } from 'react';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Card, CardBody, CardHeader, CardTitle, Col, Row, Table } from 'react-bootstrap';

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
  const get  = (name) => colorMap[`color.${name}`] || null;
  const rgb  = (name) => { const v = get(name); return v ? hexToRgb(v) : null; };

  const bgStyle = (name) => {
    const v = get(name);
    return v ? { backgroundColor: v, color: '#fff', borderColor: v } : {};
  };
  const softBgStyle = (name) => {
    const r = rgb(name);
    return r ? { backgroundColor: `rgba(${r},0.12)`, color: get(name) ?? 'inherit' } : {};
  };
  const borderStyle = (name) => {
    const v = get(name);
    return v ? { borderColor: v, borderWidth: 2, borderStyle: 'solid' } : {};
  };

  return { get, bgStyle, softBgStyle, borderStyle };
}

// ── Demo Box helper ───────────────────────────────────────────────────────────
const Box = ({ children, style = {}, soft = false, token = 'primary', tokens }) => {
  const s = tokens
    ? (soft ? tokens.softBgStyle(token) : tokens.bgStyle(token))
    : {};
  return (
    <div
      className="d-flex align-items-center justify-content-center rounded fw-semibold py-2 px-1"
      style={{ minHeight: 44, fontSize: 13, ...s, ...style }}
    >
      {children}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const Page = () => {
  const { colorMap } = useColorTokens();
  const tokens = tokenHelpers(colorMap);

  return <>
    <PageBreadcrumb title="Grids" subtitle="UI" />
    <Row className="g-4">
      <Col xs={12}><GridOptions tokens={tokens} /></Col>
      <Col xl={6}><EqualWidth tokens={tokens} /></Col>
      <Col xl={6}><SettingOneColumnWidth tokens={tokens} /></Col>
      <Col xl={6}><VariableWidthContent tokens={tokens} /></Col>
      <Col xl={6}><ResponsiveClasses tokens={tokens} /></Col>
      <Col xl={6}><RowColumns tokens={tokens} /></Col>
      <Col xl={6}><Nesting tokens={tokens} /></Col>
      <Col xl={6}><Gutters tokens={tokens} /></Col>
      <Col xl={6}><VerticalAlignment tokens={tokens} /></Col>
      <Col xl={6}><HorizontalAlignment tokens={tokens} /></Col>
      <Col xl={6}><ColumnOrdering tokens={tokens} /></Col>
      <Col xl={6}><Offsetting tokens={tokens} /></Col>
    </Row>
  </>;
};
export default Page;

// ── Grid Options Table ────────────────────────────────────────────────────────
const gridBreakpoints = [
  { label: 'Extra small', bp: '<576px',   prefix: '.col-',    container: 'None (auto)' },
  { label: 'Small',       bp: '≥576px',   prefix: '.col-sm-', container: '540px' },
  { label: 'Medium',      bp: '≥768px',   prefix: '.col-md-', container: '720px' },
  { label: 'Large',       bp: '≥992px',   prefix: '.col-lg-', container: '960px' },
  { label: 'X-Large',     bp: '≥1200px',  prefix: '.col-xl-', container: '1140px' },
  { label: 'XX-Large',    bp: '≥1400px',  prefix: '.col-xxl-',container: '1320px' },
];

const gridRows = [
  { label: 'Container max-width', values: gridBreakpoints.map(b => b.container) },
  { label: 'Class prefix',        values: gridBreakpoints.map(b => <code key={b.prefix}>{b.prefix}</code>) },
  { label: '# of columns',        span: true, value: '12' },
  { label: 'Gutter width',        span: true, value: '1.25rem (0.625rem on left and right)' },
  { label: 'Custom gutters',      span: true, value: 'Yes' },
  { label: 'Nestable',            span: true, value: 'Yes' },
  { label: 'Column ordering',     span: true, value: 'Yes' },
];

const GridOptions = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Grid Options</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">See how aspects of the Bootstrap grid system work across multiple devices with a handy table.</p>
      <div className="table-responsive">
        <Table className="table-bordered table-striped mb-0">
          <thead>
            <tr>
              <th />
              {gridBreakpoints.map(b => (
                <th key={b.bp} className="text-center" style={tokens.bgStyle('primary')}>
                  {b.label}<br /><small>{b.bp}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gridRows.map((row, i) => (
              <tr key={i}>
                <th className="text-nowrap" scope="row">{row.label}</th>
                {row.span
                  ? <td colSpan={6}>{row.value}</td>
                  : row.values.map((v, j) => <td key={j} className="text-center">{v}</td>)
                }
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </CardBody>
  </Card>
);

// ── Equal Width ───────────────────────────────────────────────────────────────
const EqualWidth = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Equal Width</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Two grid columns of equal width across any device using <code>.col</code>.
      </p>
      <Row className="g-2 mb-2">
        {['col-1', 'col-2'].map(l => (
          <Col key={l}><Box tokens={tokens} token="primary">{l}</Box></Col>
        ))}
      </Row>
      <Row className="g-2">
        {['col-1', 'col-2', 'col-3'].map(l => (
          <Col key={l}><Box tokens={tokens} token="secondary">{l}</Box></Col>
        ))}
      </Row>
    </CardBody>
  </Card>
);

// ── Setting One Column Width ──────────────────────────────────────────────────
const SettingOneColumnWidth = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Setting One Column Width</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Auto-layout for flexbox grid columns means you can set the width of one column and have sibling columns automatically resize around it.
      </p>
      <Row className="g-2 mb-2">
        <Col><Box tokens={tokens} token="primary" soft>col</Box></Col>
        <Col xs={6}><Box tokens={tokens} token="primary">col-6</Box></Col>
        <Col><Box tokens={tokens} token="primary" soft>col</Box></Col>
      </Row>
      <Row className="g-2">
        <Col><Box tokens={tokens} token="secondary" soft>col</Box></Col>
        <Col xs={5}><Box tokens={tokens} token="secondary">col-5</Box></Col>
        <Col><Box tokens={tokens} token="secondary" soft>col</Box></Col>
      </Row>
    </CardBody>
  </Card>
);

// ── Variable Width Content ────────────────────────────────────────────────────
const VariableWidthContent = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Variable Width Content</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Use <code>col-&#123;breakpoint&#125;-auto</code> classes to size columns based on the natural width of their content.
      </p>
      <Row className="justify-content-md-center g-2 mb-2">
        <Col xs lg={2}><Box tokens={tokens} token="info" soft>col / col-lg-2</Box></Col>
        <Col md="auto"><Box tokens={tokens} token="info">Variable width content</Box></Col>
        <Col xs lg={2}><Box tokens={tokens} token="info" soft>col / col-lg-2</Box></Col>
      </Row>
      <Row className="g-2">
        <Col><Box tokens={tokens} token="success" soft>col</Box></Col>
        <Col md="auto"><Box tokens={tokens} token="success">Variable width content</Box></Col>
        <Col lg={2}><Box tokens={tokens} token="success" soft>col-lg-2</Box></Col>
      </Row>
    </CardBody>
  </Card>
);

// ── Responsive Classes ────────────────────────────────────────────────────────
const ResponsiveClasses = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Responsive Classes</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Bootstrap&apos;s grid includes five tiers of predefined classes for building complex responsive layouts.
      </p>
      <Row className="g-2 mb-2">
        <Col xs={12} md={8}><Box tokens={tokens} token="primary">col-12 / col-md-8</Box></Col>
        <Col xs={6}  md={4}><Box tokens={tokens} token="primary" soft>col-6 / col-md-4</Box></Col>
      </Row>
      <Row className="g-2 mb-2">
        {[null, null, null].map((_, i) => (
          <Col xs={6} md={4} key={i}><Box tokens={tokens} token="secondary" soft={i % 2 !== 0}>col-6 / col-md-4</Box></Col>
        ))}
      </Row>
      <Row className="g-2">
        <Col xs={6}><Box tokens={tokens} token="info">col-6</Box></Col>
        <Col xs={6}><Box tokens={tokens} token="info" soft>col-6</Box></Col>
      </Row>
    </CardBody>
  </Card>
);

// ── Row Columns ───────────────────────────────────────────────────────────────
const RowColumns = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Row Columns</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Use the responsive <code>row-cols-*</code> classes to quickly set the number of columns that best render your content.
      </p>
      <p className="text-muted mb-1"><code>row-cols-2</code></p>
      <Row xs={2} className="g-2 mb-3">
        {[1, 2, 3, 4].map(i => (
          <Col key={i}><Box tokens={tokens} token="primary" soft={i % 2 === 0}>Column</Box></Col>
        ))}
      </Row>
      <p className="text-muted mb-1"><code>row-cols-3</code></p>
      <Row xs={3} className="g-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Col key={i}><Box tokens={tokens} token="secondary" soft={i % 2 === 0}>Column</Box></Col>
        ))}
      </Row>
    </CardBody>
  </Card>
);

// ── Nesting ───────────────────────────────────────────────────────────────────
const Nesting = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Nesting</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        To nest your content with the default grid, add a new <code>.row</code> and set of <code>.col-sm-*</code> columns within an existing <code>.col-sm-*</code> column.
      </p>
      <Row className="g-2">
        <Col sm={9}>
          <Box tokens={tokens} token="primary" style={{ flexDirection: 'column', alignItems: 'stretch', minHeight: 'auto', padding: '8px' }}>
            <div className="mb-2 text-center" style={{ fontSize: 12 }}>Level 1: col-sm-9</div>
            <Row className="g-2">
              <Col xs={8} sm={6}><Box tokens={tokens} token="success">L2: col-8 col-sm-6</Box></Col>
              <Col xs={4} sm={6}><Box tokens={tokens} token="success" soft>L2: col-4 col-sm-6</Box></Col>
            </Row>
          </Box>
        </Col>
        <Col sm={3}><Box tokens={tokens} token="primary" soft>col-sm-3</Box></Col>
      </Row>
    </CardBody>
  </Card>
);

// ── Gutters ───────────────────────────────────────────────────────────────────
const Gutters = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Gutters</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Gutters are the padding between columns. Use <code>g-*</code>, <code>gx-*</code>, <code>gy-*</code> to control spacing.
      </p>
      <p className="text-muted mb-1"><small>Horizontal gutters <code>gx-5</code></small></p>
      <Row className="gx-5 mb-3">
        <Col><Box tokens={tokens} token="primary" soft>col</Box></Col>
        <Col><Box tokens={tokens} token="primary">col</Box></Col>
      </Row>
      <p className="text-muted mb-1"><small>Vertical gutters <code>gy-3</code></small></p>
      <Row className="gy-3 mb-3">
        {[1, 2, 3, 4].map(i => (
          <Col xs={6} key={i}><Box tokens={tokens} token="secondary" soft={i % 2 === 0}>col-6</Box></Col>
        ))}
      </Row>
      <p className="text-muted mb-1"><small>No gutters <code>g-0</code></small></p>
      <Row className="g-0">
        <Col><Box tokens={tokens} token="info" style={{ borderRadius: 0 }}>col</Box></Col>
        <Col><Box tokens={tokens} token="info" soft style={{ borderRadius: 0 }}>col</Box></Col>
        <Col><Box tokens={tokens} token="info" style={{ borderRadius: 0 }}>col</Box></Col>
      </Row>
    </CardBody>
  </Card>
);

// ── Vertical Alignment ────────────────────────────────────────────────────────
const VerticalAlignment = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Vertical Alignment</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Use flexbox alignment utilities to vertically and horizontally align columns.
      </p>
      {[
        { cls: 'align-items-start',  label: 'align-items-start',  token: 'primary' },
        { cls: 'align-items-center', label: 'align-items-center', token: 'secondary' },
        { cls: 'align-items-end',    label: 'align-items-end',    token: 'success' },
      ].map(({ cls, label, token }) => (
        <div key={cls} className="mb-2">
          <p className="text-muted mb-1"><small><code>{label}</code></small></p>
          <Row className={`${cls} g-2`} style={{ minHeight: 60, background: 'rgba(0,0,0,0.03)', borderRadius: 6 }}>
            {[1, 2, 3].map(i => (
              <Col key={i}>
                <Box tokens={tokens} token={token} soft={i % 2 === 0}>One of three cols</Box>
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </CardBody>
  </Card>
);

// ── Horizontal Alignment ──────────────────────────────────────────────────────
const HorizontalAlignment = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Horizontal Alignment</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Use <code>justify-content-*</code> to horizontally align columns.
      </p>
      {[
        { cls: 'justify-content-start',   label: 'justify-content-start',   token: 'primary' },
        { cls: 'justify-content-center',  label: 'justify-content-center',  token: 'info' },
        { cls: 'justify-content-end',     label: 'justify-content-end',     token: 'success' },
        { cls: 'justify-content-around',  label: 'justify-content-around',  token: 'warning' },
        { cls: 'justify-content-between', label: 'justify-content-between', token: 'secondary' },
      ].map(({ cls, label, token }, idx) => (
        <div key={cls} className="mb-2">
          <p className="text-muted mb-1"><small><code>{label}</code></small></p>
          <Row className={`${cls} g-2`}>
            {[1, 2].map(i => (
              <Col xs={4} key={i}><Box tokens={tokens} token={token} soft={i % 2 === 0}>col-4</Box></Col>
            ))}
          </Row>
        </div>
      ))}
    </CardBody>
  </Card>
);

// ── Column Ordering ───────────────────────────────────────────────────────────
const ColumnOrdering = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Column Ordering</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Use <code>order-*</code> classes to control the visual order of your content.
      </p>
      <Row className="g-2 mb-2">
        <Col xs="auto" order={2}><Box tokens={tokens} token="primary">First (order-2)</Box></Col>
        <Col xs="auto" order={1}><Box tokens={tokens} token="secondary">Second (order-1)</Box></Col>
      </Row>
      <Row className="g-2">
        <Col order="last"><Box tokens={tokens} token="info">First visual, order-last</Box></Col>
        <Col><Box tokens={tokens} token="success" soft>Second</Box></Col>
        <Col order="first"><Box tokens={tokens} token="warning" soft>Third visual, order-first</Box></Col>
      </Row>
    </CardBody>
  </Card>
);

// ── Offsetting ────────────────────────────────────────────────────────────────
const Offsetting = ({ tokens }) => (
  <Card>
    <CardHeader>
      <div className="flex-grow-1">
        <CardTitle as="h4">Offsetting Columns</CardTitle>
      </div>
    </CardHeader>
    <CardBody>
      <p className="text-muted">
        Move columns to the right using <code>offset-md-*</code> classes.
      </p>
      <Row className="g-2 mb-2">
        <Col md={4}><Box tokens={tokens} token="primary">col-md-4</Box></Col>
        <Col md={4} mdOffset={4}><Box tokens={tokens} token="primary" soft>col-md-4 offset-md-4</Box></Col>
      </Row>
      <Row className="g-2 mb-2">
        <Col md={3} mdOffset={3}><Box tokens={tokens} token="secondary">col-md-3 offset-md-3</Box></Col>
        <Col md={3} mdOffset={3}><Box tokens={tokens} token="secondary" soft>col-md-3 offset-md-3</Box></Col>
      </Row>
      <Row className="g-2">
        <Col md={6} mdOffset={3}><Box tokens={tokens} token="info">col-md-6 offset-md-3</Box></Col>
      </Row>
    </CardBody>
  </Card>
);
