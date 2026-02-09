import { Button, Card, CardBody, CardHeader, CardTitle, Nav, NavItem, NavLink, TabContainer, TabContent, TabPane } from 'react-bootstrap';
import Access from './Access';
import Bank from './Bank';
import Emergency from './Emergency';
import Job from './Job';
import Personal from './Personal';
const Detail = () => {
  return <>
      <TabContainer defaultActiveKey="personal">
        <Card>
          <CardHeader className="card-tabs d-flex align-items-center">
            <div className="flex-grow-1">
              <CardTitle as="h4">Fill Details</CardTitle>
            </div>

            <Nav className="nav-tabs fw-semibold card-header-tabs nav-bordered" id="staffTabs" role="tablist">
              <NavItem role="presentation">
                <NavLink eventKey="personal">Personal Info</NavLink>
              </NavItem>
              <NavItem role="presentation">
                <NavLink eventKey="job">Job Details</NavLink>
              </NavItem>
              <NavItem role="presentation">
                <NavLink eventKey="bank">Bank &amp; Salary</NavLink>
              </NavItem>
              <NavItem role="presentation">
                <NavLink eventKey="emergency">Emergency Contact</NavLink>
              </NavItem>
              <NavItem role="presentation">
                <NavLink eventKey="access">System Access</NavLink>
              </NavItem>
            </Nav>
          </CardHeader>
          <CardBody>
            <form id="addStaffForm">
              <TabContent id="staffTabsContent">
                <TabPane className="fade" eventKey="personal" id="personal">
                  <Personal />
                </TabPane>

                <TabPane className="fade" id="job" eventKey="job">
                  <Job />
                </TabPane>

                <TabPane className="fade" id="bank" eventKey="bank">
                  <Bank />
                </TabPane>

                <TabPane className="fade" id="emergency" eventKey="emergency">
                  <Emergency />
                </TabPane>

                <TabPane className="fade" id="access" eventKey="access">
                  <Access />
                </TabPane>
              </TabContent>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <Button variant="light" type="reset">
                  Reset
                </Button>
                <Button variant="success" type="submit">
                  Save Staff
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </TabContainer>
    </>;
};
export default Detail;