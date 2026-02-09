import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { sitemapData } from './components/data';
const Page = () => {
  return <>
      <PageBreadcrumb title="Sitemap" subtitle="Pages" />
      <Row>
        {sitemapData.map((section, idx) => <Col md={4} key={idx} className="mb-4">
            <Card>
              <CardBody>
                <h5 className="fw-bold text-uppercase">{section.title}</h5>
                {renderSitemapItems(section.items)}
              </CardBody>
            </Card>
          </Col>)}
      </Row>
    </>;
};
export default Page;
const renderSitemapItems = items => {
  return <ul className="list-unstyled sitemap-list mt-2">
      {items.map((item, idx) => <li key={idx} className="mb-1">
          <Link to={item.href || ''} className={`link-reset ${item.itemClassName ? `${item.itemClassName}` : ''} fw-semibold`}>
            {item.icon && <Icon icon={item.icon} className="me-1" />}
            {item.title}
          </Link>
          {item.children && renderSitemapItems(item.children)}
        </li>)}
    </ul>;
};