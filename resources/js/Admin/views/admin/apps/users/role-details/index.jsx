import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Col, Row } from 'react-bootstrap';
import MemberRoleCard from './components/MemberRoleCard';
import UserTable from './components/UserTable';
const page = () => {
  return <>
      <Row className="justify-content-center">
        <Col xs={12}>
          <div className="d-flex align-items-sm-center flex-sm-row flex-column my-3">
            <div className="flex-grow-1">
              <h4 className="fs-xl mb-1">Role Details</h4>
              <p className="text-muted mb-0">Define and manage roles to streamline operations and ensure secure access control.</p>
            </div>
            <div className="text-end">
              <Link to="" className="btn btn-success">
                <Icon icon="plus" className="me-1" /> Add New Role
              </Link>
            </div>
          </div>
          <Row>
            <Col md="5" lg="3">
              <MemberRoleCard />
            </Col>
            <Col md="8" lg="9">
              <UserTable />
            </Col>
          </Row>
        </Col>
      </Row>
    </>;
};
export default page;