import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Rating from '@admin/components/Rating';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Button, Card, CardBody, Col, Form, FormControl, FormSelect, Row } from 'react-bootstrap';
import { companyData } from './data';
const Page = () => {
  return <>
      <PageBreadcrumb title="Companies" subtitle="Apps" />
      <Row className="mb-3">
        <Col lg={12}>
          <Form className="bg-light-subtle rounded border p-3">
            <Row className="gap-3">
              <Col>
                <Row className="gap-3 justify-content-between">
                  <Col lg={4}>
                    <div className="app-search">
                      <FormControl type="text" placeholder="Search company name..." />
                      <Icon icon="search" className="app-search-icon text-muted" />
                    </div>
                  </Col>
                  <Col className="col-auto">
                    <div className="d-flex align-items-center gap-2">
                      <span className="me-2 fw-semibold">Filter By:</span>

                      <div className="app-search">
                        <FormSelect className="form-control my-1 my-md-0">
                          <option>Location</option>
                          <option value="USA">USA</option>
                          <option value="Canada">Canada</option>
                          <option value="Germany">Germany</option>
                          <option value="India">India</option>
                          <option value="UK">United Kingdom</option>
                        </FormSelect>
                        <Icon icon="map-pin" className="app-search-icon text-muted" />
                      </div>

                      <div className="app-search">
                        <FormSelect className="form-control my-1 my-md-0">
                          <option value="Category">Category</option>
                          <option value="Tech">Tech</option>
                          <option value="Finance">Finance</option>
                          <option value="eCommerce">eCommerce</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Automotive">Automotive</option>
                        </FormSelect>
                        <Icon icon="briefcase" className="app-search-icon text-muted" />
                      </div>

                      <div className="app-search">
                        <FormSelect className="form-control my-1 my-md-0">
                          <option>Rating</option>
                          <option value="5">5 Stars</option>
                          <option value="4">4 Stars & Up</option>
                          <option value="3">3 Stars & Up</option>
                          <option value="2">2 Stars & Up</option>
                          <option value="1">1 Star & Up</option>
                        </FormSelect>
                        <Icon icon="star" className="app-search-icon text-muted" />
                      </div>

                      <Button variant="primary" type="submit">
                        <Icon icon="plus" className="me-1" /> Add
                      </Button>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Form>
        </Col>
      </Row>
      <Row>
        {companyData.map((company, idx) => <Col xl={4} md={6} key={idx}>
            <CompanyCard company={company} />
          </Col>)}
      </Row>

      <ul className="pagination pagination-rounded pagination-boxed mb-3 justify-content-center">
        <li className="page-item">
          <Link className="page-link" to="" aria-label="Previous">
            <span aria-hidden="true">«</span>
          </Link>
        </li>
        <li className="page-item active">
          <Link className="page-link" to="">
            1
          </Link>
        </li>
        <li className="page-item">
          <Link className="page-link" to="">
            2
          </Link>
        </li>
        <li className="page-item">
          <Link className="page-link" to="">
            3
          </Link>
        </li>
        <li className="page-item">
          <Link className="page-link" to="">
            4
          </Link>
        </li>
        <li className="page-item">
          <Link className="page-link" to="">
            5
          </Link>
        </li>
        <li className="page-item">
          <Link className="page-link" to="" aria-label="Next">
            <span aria-hidden="true">»</span>
          </Link>
        </li>
      </ul>
    </>;
};
export default Page;
const CompanyCard = ({
  company
}) => {
  const {
    revenue,
    description,
    ceo,
    name,
    founded,
    exchange,
    industry,
    location,
    image,
    ticker,
    website,
    rating,
    employees
  } = company;
  return <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="d-flex align-items-center gap-3">
            <img src={image} alt={name} width="50" height="50" className="rounded" />
            <div>
              <h4 className="mb-1 fw-bold">{name}</h4>
              <a href={`https://${website}`} className="text-muted small" target="_blank">
                www.{name.split(' ')[0].toLowerCase()}.com
              </a>
            </div>
          </div>

          <button className="btn btn-outline-danger btn-sm">
            <Icon icon="heart" className="me-1" />
            Follow
          </button>
        </div>

        <div className="mb-3 d-flex flex-wrap gap-2">
          <span className="badge bg-primary-subtle text-primary px-2 py-1 rounded-pill">{location}</span>
          <span className="badge bg-success-subtle text-success px-2 py-1 rounded-pill">{industry}</span>
          <span className="badge bg-info-subtle text-info px-2 py-1 rounded-pill">Founded: {founded}</span>
        </div>

        <p className="text-muted mb-4">{description}</p>

        <Row className="text-center mb-4">
          <Col xs={6} md={3}>
            <h5 className="mb-0 fw-bold">{employees}</h5>
            <small className="text-muted">Employees</small>
          </Col>
          <Col xs={6} md={3}>
            <h5 className="mb-0 fw-bold">{revenue}</h5>
            <small className="text-muted">Revenue</small>
          </Col>
          <Col xs={6} md={3}>
            <h5 className="mb-0 fw-bold">{ceo}</h5>
            <small className="text-muted">CEO</small>
          </Col>
          <Col xs={6} md={3}>
            <h5 className="mb-0 fw-bold">{ticker}</h5>
            <small className="text-muted">{exchange}</small>
          </Col>
        </Row>

        <div className="d-flex justify-content-between align-items-center">
          <Rating rating={rating} className="fs-lg d-flex gap-1" />
          <Button variant="primary" size="sm">
            Visit Company Profile
          </Button>
        </div>
      </CardBody>
    </Card>;
};