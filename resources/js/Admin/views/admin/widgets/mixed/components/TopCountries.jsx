import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap';
import { topCountryData } from './data';
const TopCountries = () => {
  return <>
      <Card>
        <CardHeader className="justify-content-between align-items-center">
          <CardTitle as="h4">Top Countries</CardTitle>
        </CardHeader>
        <CardBody>
          {topCountryData.map((item, idx) => <div className="d-flex align-items-center gap-2 mb-3" key={idx}>
              <img src={item.image} alt={item.name} className="avatar-xxs rounded" />
              <h5 className="mb-0 fw-medium">
                <Link to="" className="link-reset">
                  {item.name}
                </Link>
                <small className="text-muted">Pop: {item.population}</small>
              </h5>
              <div className="ms-auto">
                <div className="d-flex align-items-center gap-3 text-end">
                  <p className="mb-0 fw-medium">{item.visitors}</p>
                  <p className="badge badge-label fs-xxs badge-soft-success mb-0">+{item.change}%</p>
                </div>
              </div>
            </div>)}
          <div className="text-center mt-4">
            <Link to="" className="link-reset text-decoration-underline fw-semibold link-offset-3">
              View all Countries <Icon icon="world" />
            </Link>
          </div>
        </CardBody>
      </Card>
    </>;
};
export default TopCountries;