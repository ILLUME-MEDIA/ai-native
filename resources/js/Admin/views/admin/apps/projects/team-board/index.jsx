import { Col, Row } from 'react-bootstrap';
import AddTeam from './components/AddTeam';
import TeamCard from './components/TeamCard';
import { teamData } from './components/data';
const Page = () => {
  return <>
      <Row className="justify-content-center">
        <Col xs={12}>
          <div className="d-flex align-items-sm-center flex-sm-row flex-column my-3">
            <div className="flex-grow-1">
              <h4 className="fs-xl mb-1">Manage Teams</h4>
              <p className="text-muted mb-0">Assign roles to streamline teamwork and secure access.</p>
            </div>

            <div className="text-end">
              <AddTeam />
            </div>
          </div>

          <Row>
            {teamData.map((team, idx) => <Col md={6} lg={4} key={idx}>
                <TeamCard team={team} />
              </Col>)}
          </Row>
        </Col>
      </Row>
    </>;
};
export default Page;