import { useState, useEffect } from 'react';
import small1 from '@admin/assets/images/stock/small-1.jpg';
import small10 from '@admin/assets/images/stock/small-10.jpg';
import small2 from '@admin/assets/images/stock/small-2.jpg';
import small3 from '@admin/assets/images/stock/small-3.jpg';
import small4 from '@admin/assets/images/stock/small-4.jpg';
import small5 from '@admin/assets/images/stock/small-5.jpg';
import small6 from '@admin/assets/images/stock/small-6.jpg';
import small8 from '@admin/assets/images/stock/small-8.jpg';
import small9 from '@admin/assets/images/stock/small-9.jpg';
import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import { Link } from 'react-router';
import { Card, CardBody, CardFooter, CardHeader, CardText, CardTitle, Col, Nav, NavItem, NavLink, Row } from 'react-bootstrap';

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

// ── Token style helpers (derived from colorMap) ────────────────────────────────
function tokenHelpers(colorMap) {
  const get = (name) => colorMap[`color.${name}`] || null;
  const rgb = (name) => { const v = get(name); return v ? hexToRgb(v) : null; };

  const bgStyle = (name) => {
    const v = get(name);
    return v ? { backgroundColor: v, color: '#fff', borderColor: v } : {};
  };
  const borderStyle = (name, width = 1) => {
    const v = get(name);
    return v ? { borderColor: v, borderWidth: width } : {};
  };
  const softBgStyle = (name) => {
    const r = rgb(name);
    return r ? { backgroundColor: `rgba(${r},0.15)` } : {};
  };
  const gradientStyle = (name) => {
    const v = get(name);
    return v ? {
      background: `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0) 100%), ${v}`,
      color: '#fff',
      borderColor: v,
    } : {};
  };

  return { get, bgStyle, borderStyle, softBgStyle, gradientStyle };
}

// ── Card Group Data ───────────────────────────────────────────────────────────
const CardGroupDetails = [{
  id: 1, image: small8, title: 'Card title',
  text: 'This is a wider card with supporting text below as a natural lead-in to additional content. This content is a little bit longer.',
  subtext: 'Last updated 3 mins ago'
}, {
  id: 2, image: small9, title: 'Card title',
  text: 'This card has supporting text below as a natural lead-in to additional content.',
  subtext: 'Last updated 3 mins ago'
}, {
  id: 3, image: small10, title: 'Card title',
  text: 'This is a wider card with supporting text below as a natural lead-in to additional content. This card has even longer content than the first to show that equal height action.',
  subtext: 'Last updated 3 mins ago'
}];

// ── Page ──────────────────────────────────────────────────────────────────────
const Page = () => {
  const { colorMap } = useColorTokens();
  const tokens = tokenHelpers(colorMap);

  return <>
    <PageBreadcrumb title="Cards" subtitle="UI" />
    <Row>
      <Col sm={6} lg={3}><Basic /></Col>
      <Col sm={6} lg={3}><BasicCardWithTitle /></Col>
      <Col sm={6} lg={3}><CardWithBackgroundColor tokens={tokens} /></Col>
      <Col sm={6} lg={3}><CardWithBackgroundGradient tokens={tokens} /></Col>
    </Row>
    <Row>
      <Col md={4}><CardWithHeader /></Col>
      <Col md={4}><CardWithSubHeader /></Col>
      <Col md={4}><FeaturedCardTitle /></Col>
    </Row>
    <Row>
      <Col xs={12}><h4 className="mb-4 mt-3">Advanced Card</h4></Col>
    </Row>
    <Row>
      <Col md={4}><CardWithActionTools /></Col>
      <Col md={4}><CardWithActionToolsBgColor tokens={tokens} /></Col>
      <Col md={4}><CardWithActionTools /></Col>
    </Row>
    <Row>
      <Col xs={12}><h4 className="mb-4 mt-3">Bordered Card</h4></Col>
    </Row>
    <Row>
      <Col md={4}><CardWithColoredBorder tokens={tokens} /></Col>
      <Col md={4}><CardWithSimpleBorder tokens={tokens} /></Col>
      <Col md={4}><CardWithDoubleBorder tokens={tokens} /></Col>
    </Row>
    <Row>
      <Col md={4}><CardWithStartBorder /></Col>
      <Col md={4}><CardWithColored tokens={tokens} /></Col>
      <Col md={4}><CardColoredBorder tokens={tokens} /></Col>
    </Row>
    <Row>
      <Col xs={12}><h4 className="mb-4 mt-3">Horizontal Card</h4></Col>
    </Row>
    <Row>
      <Col lg={6}><CardWithHorizontalMode /></Col>
      <Col lg={6}><CardWithHorizontalMode2 /></Col>
    </Row>
    <Row>
      <Col xs={12}><h4 className="mb-4 mt-3">Stretched Link</h4></Col>
    </Row>
    <Row>
      <Col sm={6} lg={3}><CardWithStretchedLink /></Col>
      <Col sm={6} lg={3}><CardWithStretchedLink2 /></Col>
      <Col sm={6} lg={3}><CardWithStretchedLink3 /></Col>
      <Col sm={6} lg={3}><CardWithStretchedLink4 /></Col>
    </Row>
    <Row>
      <Col xs={12}><h4 className="mb-4 mt-3">Card Group</h4></Col>
    </Row>
    <Row>
      <Col xs={12}>
        <div className="card-group mb-3">
          {CardGroupDetails.map((item, idx) => <CardWithGroup item={item} key={idx} />)}
        </div>
      </Col>
    </Row>
    <div className="card-group">
      {CardGroupDetails.map((item, idx) => <CardTitle4 item={item} key={idx} />)}
    </div>
    <Row>
      <Col xs={12}><h4 className="my-4">Navigation with Card</h4></Col>
    </Row>
    <Row>
      <Col xl={6}><NavigationWithCard /></Col>
      <Col xl={6}><NavigationWithCard2 /></Col>
    </Row>
  </>;
};
export default Page;

// ── Basic Cards ───────────────────────────────────────────────────────────────
const Basic = () => (
  <Card>
    <CardBody>
      <CardText>Some quick example text to build on the card title and make up the bulk of the card&apos;s content. Some quick example text to build on the card title and make up.</CardText>
      <Link to="" className="btn btn-sm btn-primary">Button</Link>
    </CardBody>
  </Card>
);

const BasicCardWithTitle = () => (
  <Card>
    <CardBody>
      <CardTitle as="h5" className="mb-2">Basic Card with Title</CardTitle>
      <CardText>Some quick example text to build on the card title and make up the bulk of the card&apos;s content. Some quick example text to build on the card title and make up.</CardText>
      <Link to="" className="btn btn-sm btn-primary">Button</Link>
    </CardBody>
  </Card>
);

// ── Token-aware colored cards ─────────────────────────────────────────────────
const CardWithBackgroundColor = ({ tokens }) => (
  <Card className="border-0" style={tokens.bgStyle('primary')}>
    <CardBody>
      <CardTitle as="h5" className="mb-2">Card with Background Color</CardTitle>
      <CardText>Some quick example text to build on the card title and make up the bulk of the card&apos;s content.</CardText>
      <Link to="" className="btn btn-sm btn-light">Button</Link>
    </CardBody>
  </Card>
);

const CardWithBackgroundGradient = ({ tokens }) => (
  <Card className="border-0" style={tokens.gradientStyle('secondary')}>
    <CardBody>
      <CardTitle as="h5" className="mb-2">Card with Background Gradient</CardTitle>
      <CardText>Some quick example text to build on the card title and make up the bulk of the card&apos;s content.</CardText>
      <Link to="" className="btn btn-sm btn-light">Button</Link>
    </CardBody>
  </Card>
);

// ── Header/Footer Cards ───────────────────────────────────────────────────────
const CardWithHeader = () => (
  <Card>
    <CardHeader as="h5">Card with Header</CardHeader>
    <CardBody>
      <CardTitle as="h5" className="card-title mb-2">Special title treatment</CardTitle>
      <p className="card-text">With supporting text below as a natural lead-in to additional content.</p>
      <Link to="" className="btn btn-sm btn-primary">Go somewhere</Link>
    </CardBody>
  </Card>
);

const CardWithSubHeader = () => (
  <Card>
    <CardHeader className="d-block">
      <CardTitle as="h5" className="mb-1">Card with Sub Header</CardTitle>
      <h6 className="card-subtitle text-body-secondary">Card subtitle</h6>
    </CardHeader>
    <CardBody>
      <blockquote className="card-bodyquote mb-0">
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante.</p>
        <footer className="mb-0">Someone famous in <cite title="Source Title">Source Title</cite></footer>
      </blockquote>
    </CardBody>
  </Card>
);

const FeaturedCardTitle = () => (
  <Card>
    <CardHeader className="bg-light-subtle">Featured Card Title</CardHeader>
    <CardBody>
      <Link to="" className="btn btn-sm btn-primary">Go somewhere</Link>
    </CardBody>
    <CardFooter className="border-top border-light text-muted">2 days ago</CardFooter>
  </Card>
);

// ── Advanced Cards ────────────────────────────────────────────────────────────
const CardWithActionTools = () => (
  <Card>
    <CardHeader as="h5">Card with Header</CardHeader>
    <CardBody>
      <p className="card-text">With supporting text below as a natural lead-in to additional content.</p>
      <Link to="" className="btn btn-sm btn-primary">Go somewhere</Link>
    </CardBody>
  </Card>
);

const CardWithActionToolsBgColor = ({ tokens }) => (
  <Card className="border-0" style={tokens.bgStyle('primary')}>
    <CardHeader style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}>
      <CardTitle as="h5">Card with Action Tools &amp; Background Colors</CardTitle>
    </CardHeader>
    <CardBody>
      <CardText>With supporting text below as a natural lead-in to additional content.</CardText>
      <Link to="" className="btn btn-sm btn-light">Go somewhere</Link>
    </CardBody>
  </Card>
);

// ── Bordered Cards ────────────────────────────────────────────────────────────
const CardWithColoredBorder = ({ tokens }) => {
  const s = tokens.borderStyle('primary');
  return (
    <Card style={{ ...s, borderStyle: 'solid' }}>
      <CardBody>
        <CardTitle as="h5" className="mb-2">Card with Colored Border</CardTitle>
        <CardText>With supporting text below as a natural lead-in to additional content.</CardText>
        <Link to="" className="btn btn-primary btn-sm">Button</Link>
      </CardBody>
    </Card>
  );
};

const CardWithSimpleBorder = ({ tokens }) => {
  const s = tokens.borderStyle('primary');
  return (
    <Card style={{ ...s, borderStyle: 'dashed' }}>
      <CardBody>
        <CardTitle as="h5" className="mb-2">Card with Simple Border</CardTitle>
        <CardText>With supporting text below as a natural lead-in to additional content.</CardText>
        <Link to="" className="btn btn-primary btn-sm">Button</Link>
      </CardBody>
    </Card>
  );
};

const CardWithDoubleBorder = ({ tokens }) => {
  const s = tokens.borderStyle('primary', 2);
  const primaryHex = tokens.get('primary');
  return (
    <Card style={{ ...s, borderStyle: 'solid' }}>
      <CardBody>
        <CardTitle as="h5" className="mb-2" style={primaryHex ? { color: primaryHex } : {}}>
          Card with Double Border
        </CardTitle>
        <CardText>With supporting text below as a natural lead-in to additional content.</CardText>
        <Link to="" className="btn btn-primary btn-sm">Button</Link>
      </CardBody>
    </Card>
  );
};

const CardWithStartBorder = () => (
  <Card className="card-bordered">
    <CardBody>
      <CardTitle as="h5" className="mb-2">Card with Start Border</CardTitle>
      <CardText>With supporting text below as a natural lead-in to additional content.</CardText>
      <Link to="" className="btn btn-dark btn-sm">Button</Link>
    </CardBody>
  </Card>
);

const CardWithColored = ({ tokens }) => {
  const s = tokens.borderStyle('primary');
  const primaryHex = tokens.get('primary');
  return (
    <Card className="card-bordered" style={{ ...s, borderStyle: 'solid' }}>
      <CardBody>
        <CardTitle as="h4" className="mb-2" style={primaryHex ? { color: primaryHex } : {}}>
          Card with Colored Border
        </CardTitle>
        <CardText>With supporting text below as a natural lead-in to additional content.</CardText>
        <Link to="" className="btn btn-primary btn-sm">Button</Link>
      </CardBody>
    </Card>
  );
};

const CardColoredBorder = ({ tokens }) => {
  const s = tokens.borderStyle('info');
  return (
    <Card className="card-bordered" style={{ ...s, borderStyle: 'solid' }}>
      <CardBody>
        <CardTitle as="h5" className="mb-2">Card with Colored Border</CardTitle>
        <CardText>With supporting text below as a natural lead-in to additional content.</CardText>
        <Link to="" className="btn btn-info btn-sm">Button</Link>
      </CardBody>
    </Card>
  );
};

// ── Horizontal Cards ──────────────────────────────────────────────────────────
const CardWithHorizontalMode = () => (
  <Card>
    <Row className="g-0 align-items-center">
      <Col md={4}>
        <img src={small1} className="img-fluid rounded-start" alt="..." />
      </Col>
      <Col md={8}>
        <CardBody>
          <CardTitle as="h5" className="mb-3">Card with Horizontal Mode</CardTitle>
          <CardText>This is a wider card with supporting text below as a natural lead-in to additional content. This content is a little bit longer.</CardText>
          <CardText><small className="text-muted">Last updated 3 mins ago</small></CardText>
        </CardBody>
      </Col>
    </Row>
  </Card>
);

const CardWithHorizontalMode2 = () => (
  <Card>
    <Row className="g-0 align-items-center">
      <Col md={8}>
        <CardBody>
          <CardTitle as="h5" className="mb-3">Card with Horizontal Mode</CardTitle>
          <CardText>This is a wider card with supporting text below as a natural lead-in to additional content. This content is a little bit longer.</CardText>
          <CardText><small className="text-muted">Last updated 3 mins ago</small></CardText>
        </CardBody>
      </Col>
      <Col md={4}>
        <img src={small2} className="img-fluid rounded-start" alt="..." />
      </Col>
    </Row>
  </Card>
);

// ── Stretched Link Cards ──────────────────────────────────────────────────────
const CardWithStretchedLink = () => (
  <Card>
    <img src={small3} className="card-img-top img-fluid" alt="..." width={373} height={233} />
    <CardBody>
      <CardTitle as="h5" className="mb-2">Card with stretched link</CardTitle>
      <Link to="#" className="btn btn-primary mt-2 stretched-link">Go somewhere</Link>
    </CardBody>
  </Card>
);

const CardWithStretchedLink2 = () => (
  <Card>
    <img src={small4} className="card-img-top img-fluid" alt="..." width={373} height={233} />
    <CardBody>
      <CardTitle as="h5" className="mb-2">
        <Link to="#" className="text-primary stretched-link">Card with stretched link</Link>
      </CardTitle>
      <CardText>Some quick example text to build on the card up the bulk of the card&apos;s content.</CardText>
    </CardBody>
  </Card>
);

const CardWithStretchedLink3 = () => (
  <Card>
    <img src={small5} className="card-img-top img-fluid" alt="..." width={373} height={233} />
    <CardBody>
      <CardTitle as="h5" className="mb-2">Card with stretched link</CardTitle>
      <Link to="#" className="btn btn-primary mt-2 stretched-link">Go somewhere</Link>
    </CardBody>
  </Card>
);

const CardWithStretchedLink4 = () => (
  <Card>
    <img src={small6} className="card-img-top img-fluid" alt="..." width={373} height={233} />
    <CardBody>
      <CardTitle as="h5" className="mb-2">
        <Link to="#" className="text-primary stretched-link">Card with stretched link</Link>
      </CardTitle>
      <CardText>Some quick example text to build on the card up the bulk of the card&apos;s content.</CardText>
    </CardBody>
  </Card>
);

// ── Card Group ────────────────────────────────────────────────────────────────
const CardWithGroup = ({ item }) => (
  <Card className="d-block">
    <img className="card-img-top img-fluid" height={324} width={519} src={item.image} alt="Card image cap" />
    <CardBody>
      <CardTitle className="mb-2" as="h5">{item.title}</CardTitle>
      <CardText>{item.text}</CardText>
      <CardText><small className="text-muted">{item.subtext}</small></CardText>
    </CardBody>
  </Card>
);

const CardTitle4 = ({ item }) => (
  <Card>
    <CardBody>
      <CardTitle className="mb-2" as="h5">{item.title}</CardTitle>
      <CardText>{item.text}</CardText>
    </CardBody>
    <CardFooter>
      <small className="text-body-secondary">{item.subtext}</small>
    </CardFooter>
  </Card>
);

// ── Navigation Cards ──────────────────────────────────────────────────────────
const NavigationWithCard = () => (
  <Card className="text-center">
    <CardHeader>
      <Nav className="nav-tabs card-header-tabs">
        <NavItem><NavLink active>Active</NavLink></NavItem>
        <NavItem><NavLink href="#">Link</NavLink></NavItem>
        <NavItem><NavLink disabled>Disabled</NavLink></NavItem>
      </Nav>
    </CardHeader>
    <CardBody>
      <CardTitle as="h5" className="mb-2">Special title treatment</CardTitle>
      <CardText>With supporting text below as a natural lead-in to additional content.</CardText>
      <Link to="" className="btn btn-primary">Go somewhere</Link>
    </CardBody>
  </Card>
);

const NavigationWithCard2 = () => (
  <Card className="text-center">
    <CardHeader>
      <Nav className="nav-pills card-header-pills">
        <NavItem><NavLink active>Active</NavLink></NavItem>
        <NavItem><NavLink href="">Link</NavLink></NavItem>
        <NavItem><NavLink disabled>Disabled</NavLink></NavItem>
      </Nav>
    </CardHeader>
    <CardBody>
      <CardTitle as="h5" className="mb-2">Special title treatment</CardTitle>
      <CardText>With supporting text below as a natural lead-in to additional content.</CardText>
      <Link to="" className="btn btn-primary">Go somewhere</Link>
    </CardBody>
  </Card>
);
