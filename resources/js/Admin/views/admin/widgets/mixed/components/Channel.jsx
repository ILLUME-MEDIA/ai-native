import user10 from '@admin/assets/images/users/user-10.jpg';
import user2 from '@admin/assets/images/users/user-2.jpg';
import user3 from '@admin/assets/images/users/user-3.jpg';
import user4 from '@admin/assets/images/users/user-4.jpg';
import user5 from '@admin/assets/images/users/user-5.jpg';
import user7 from '@admin/assets/images/users/user-7.jpg';
import user8 from '@admin/assets/images/users/user-8.jpg';
import user9 from '@admin/assets/images/users/user-9.jpg';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import React from 'react';
import { Button, Card, CardBody, CardHeader, CardTitle, Col, Row } from 'react-bootstrap';
import { channelData } from './data';
const Channel = () => {
  return <>
      <Row>
        <Col xl="6">
          <Card>
            <CardHeader>
              <CardTitle as="h4">Channels</CardTitle>
            </CardHeader>
            <CardBody>
              {channelData.map((item, idx) => <React.Fragment key={idx}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div className="d-flex align-items-center gap-2">
                      <img src={item.image} alt="Meta" className="avatar-xxs rounded" />
                      <span>{item.name}</span>
                    </div>
                    <span className="fw-semibold">{item.progress}%</span>
                  </div>
                  <div className="progress progress-md mb-3">
                    <div className="progress-bar bg-success" style={{
                  width: `${item.progress}%`
                }} />
                  </div>
                </React.Fragment>)}

              <Button variant="primary" className="w-100 mt-2">
                Download Reports
              </Button>
            </CardBody>
          </Card>
          <Card className="bg-secondary bg-gradient border-0 ">
            <CardBody className="bg-flower" style={{
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right bottom'
          }}>
              <h5 className="mb-1 text-white fw-semibold">Company Contact</h5>
              <p className="text-white text-opacity-75 mb-3">Get in touch with our support team.</p>
              <div className="mb-2 text-white text-opacity-75">
                <Icon icon="mail" className="me-2 text-white" />
                support@company.com
              </div>
              <div className="mb-2 text-white text-opacity-75">
                <Icon icon="phone" className="me-2 text-white" />
                +1 (234) 567-890
              </div>
              <Link to="mailto:support@company.com" className="btn btn-light w-100">
                Contact Support
              </Link>
            </CardBody>
          </Card>
        </Col>
        <Col xl="6">
          <Card>
            <CardBody>
              <div className="d-flex align-items-center mb-3 text-muted">
                <span className="me-1">★</span>
                <span>
                  <strong>Dane</strong>, Your Project Progress Can <strong>Inspire</strong> Your Team
                </span>
              </div>

              <div className="avatar-group avatar-group-sm mb-3">
                <div className="avatar">
                  <img src={user7} alt="" className="rounded-circle avatar-sm" />
                </div>
                <div className="avatar">
                  <img src={user8} alt="" className="rounded-circle avatar-sm" />
                </div>
                <div className="avatar">
                  <img src={user9} alt="" className="rounded-circle avatar-sm" />
                </div>
                <div className="avatar">
                  <img src={user10} alt="" className="rounded-circle avatar-sm" />
                </div>
              </div>

              <p className="mb-1">
                <strong>5 Team Members</strong> are currently waiting for your update on this project.
              </p>
              <p className="text-muted fs-xs mb-3">Share your progress and the team will be notified instantly.</p>

              <Button variant="info" className="w-100 rounded-pill">
                Update Project
              </Button>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="fw-semibold mb-1">Project Update Needed</h6>
                  <span className="text-muted">Your team is waiting for your input</span>
                </div>
                <span className="badge text-bg-warning fw-semibold">Pending</span>
              </div>

              <div className="d-flex align-items-center mb-3">
                <div className="avatar-group avatar-group-sm me-2">
                  <div className="avatar">
                    <img src={user2} alt="" className="rounded-circle avatar-sm" />
                  </div>
                  <div className="avatar">
                    <img src={user3} alt="" className="rounded-circle avatar-sm" />
                  </div>
                  <div className="avatar">
                    <img src={user4} alt="" className="rounded-circle avatar-sm" />
                  </div>
                  <div className="avatar">
                    <img src={user5} alt="" className="rounded-circle avatar-sm" />
                  </div>
                </div>
                <small className="text-muted ms-1">+3 more reviewers</small>
              </div>

              <div className="mb-3">
                <p className="mb-1">
                  <strong>Design System Revamp</strong> requires your final approval.
                </p>
                <p className="text-muted fst-italic mb-0">Once approved, the development team will begin implementing the new UI components.</p>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <small className="text-muted">Progress</small>
                  <small className="fw-semibold">72%</small>
                </div>
                <div className="progress progress-md">
                  <div className="progress-bar bg-success" style={{
                  width: '72%'
                }} />
                </div>
              </div>

              <Button variant="primary" className="w-100 rounded-pill">
                Review &amp; Approve
              </Button>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Channel;