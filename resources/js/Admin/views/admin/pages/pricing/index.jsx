import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Card, CardBody, CardFooter, Col, Row } from 'react-bootstrap';
import { pricingPlanData } from './components/data';
const Page = () => {
  return <>
      <PageBreadcrumb title="Pricing" subtitle="Pages" />
      <Row className="mb-4">
        {pricingPlanData.map((plan, idx) => <Col xl="3" md="6" key={idx}>
            <Card className={`h-100 my-4 my-lg-0 ${plan.isPopular ? 'text-bg-primary' : ''}`}>
              <CardBody className="p-lg-4 pb-0 text-center">
                <h3 className="fw-bold mb-1">{plan.name}</h3>
                <p className={`mb-0 ${plan.isPopular ? 'text-white-50' : 'text-muted'}`}>{plan.subtitle}</p>
                <div className="my-4">
                  <h1 className="display-6 fw-bold mb-0">{plan.price}</h1>
                  <small className={`d-block fs-base ${plan.isPopular ? 'text-white-50' : 'text-muted'}`}>{plan.duration}</small>
                  <small className={`d-block ${plan.isPopular ? 'text-white-50' : 'text-muted'}`}>{plan.planInfo}</small>
                </div>
                <ul className="list-unstyled text-start fs-sm mb-0">
                  {plan.features.map((feature, i) => <li className="mb-2" key={i}>
                      <Icon icon={feature.included ? 'check' : 'x'} className={`me-2 fs-5 ${feature.included ? 'text-success' : 'text-danger'}`} />
                      {feature.title}
                    </li>)}
                </ul>
              </CardBody>

              <CardFooter className="bg-transparent px-5 pb-4">
                <Link to={plan.href} className={`btn ${plan.buttonClassName} w-100 py-2 fw-semibold rounded-pill`}>
                  {plan.buttonText}
                </Link>
              </CardFooter>
            </Card>
          </Col>)}
      </Row>
    </>;
};
export default Page;