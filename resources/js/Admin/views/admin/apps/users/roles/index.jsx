import { Col, Row } from 'react-bootstrap';
import AddRoleModal from './components/AddRoleModal';
import { memberRoleData } from './components/data';
import MemberRoleCard from './components/MemberRoleCard';
import Users from './components/UsersTable';
const Page = () => {
  return <>
      <Row className="justify-content-center">
        <Col xs={12}>
          <div className="d-flex align-items-sm-center flex-sm-row flex-column my-3">
            <div className="flex-grow-1">
              <h4 className="fs-xl mb-1">Manage Roles</h4>
              <p className="text-muted mb-0">Manage roles for smoother operations and secure access.</p>
            </div>
            <div className="text-end">
              <AddRoleModal />
            </div>
          </div>
          <Row>
            {memberRoleData.map((member, idx) => <Col md={6} lg={3} key={idx}>
                <MemberRoleCard member={member} />
              </Col>)}
          </Row>
          <Row>
            <Col xs={12}>
              <Users />
            </Col>
          </Row>
        </Col>
      </Row>
    </>;
};
export default Page;