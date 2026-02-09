import PageBreadcrumb from '@admin/components/PageBreadcrumb';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Card, CardBody, CardFooter, Col, Row } from 'react-bootstrap';
import { contactData } from './components/data';
const Page = () => {
  return <>
      <PageBreadcrumb title="Contacts" subtitle="CRM" />

      <Row>
        <ContactCard />
      </Row>
      <ul className="pagination pagination-rounded pagination-boxed justify-content-center">
        <li className="page-item">
          <a className="page-link" href="" aria-label="Previous">
            <span aria-hidden="true">«</span>
          </a>
        </li>
        <li className="page-item active">
          <a className="page-link" href="">
            1
          </a>
        </li>
        <li className="page-item">
          <a className="page-link" href="">
            2
          </a>
        </li>
        <li className="page-item">
          <a className="page-link" href="">
            3
          </a>
        </li>
        <li className="page-item">
          <a className="page-link" href="">
            4
          </a>
        </li>
        <li className="page-item">
          <a className="page-link" href="">
            5
          </a>
        </li>
        <li className="page-item">
          <a className="page-link" href="" aria-label="Next">
            <span aria-hidden="true">»</span>
          </a>
        </li>
      </ul>
    </>;
};
export default Page;
const ContactCard = () => {
  return <>
      {contactData.map((item, idx) => <Col md={6} xxl={4} key={idx}>
          <Card>
            <CardBody className="d-flex align-items-start">
              {item.user.image ? <img src={item.user.image} alt="avatar" className="rounded-circle me-3" width={64} height={64} /> : <div className="avatar rounded-circle me-3 flex-shrink-0" style={{
            height: 64,
            width: 64
          }}>
                  <span className="avatar-title text-bg-secondary fw-semibold rounded-circle fs-22">{item.user.name.charAt(0)}</span>
                </div>}
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <a href="#!" className="link-reset">
                      {item.user.name}
                    </a>
                  </h5>
                  <span className={`badge badge-label ${item.label.className}`}>{item.label.text}</span>
                </div>
                <p className="mb-3 text-muted fs-xs">{item.user.role}</p>
                <div className="mb-2">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <div className="avatar-xs avatar-img-size fs-24">
                      <span className="avatar-title text-bg-light fs-sm rounded-circle">
                        <Icon icon="mail" />
                      </span>
                    </div>
                    <h5 className="fs-base mb-0 fw-medium">
                      <Link to="" className="link-reset">
                        {item.user.email}
                      </Link>
                    </h5>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <div className="avatar-xs avatar-img-size fs-24">
                      <span className="avatar-title text-bg-light fs-sm rounded-circle">
                        <Icon icon="phone" />
                      </span>
                    </div>
                    <h5 className="fs-base mb-0 fw-medium">
                      <Link to="" className="link-reset">
                        {item.user.phone}
                      </Link>
                    </h5>
                  </div>
                </div>

                <div>
                  {item.categories.map((item, idx) => <span className={`badge ${item.className} me-1`} key={idx}>
                      {item.tag}
                    </span>)}
                </div>
              </div>
            </CardBody>

            <CardFooter className="bg-light-subtle d-flex justify-content-between text-center border-top border-dashed">
              {item.stats.map((item, idx) => <div key={idx}>
                  <h5 className="mb-0">
                    {item.prefix || ''}
                    {item.value}
                    {item.suffix || ''}
                  </h5>
                  <span className="text-muted">{item.title}</span>
                </div>)}
            </CardFooter>
          </Card>
        </Col>)}
    </>;
};