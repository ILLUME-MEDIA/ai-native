import Icon from "@admin/components/wrappers/Icon";
import { SimpleBar } from "@admin/components/wrappers/SimpleBar";
import { Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from "react-bootstrap";
const Megamenu = () => {
  return <div id="megamenu-columns" className="topbar-item d-none d-md-flex">
    <Dropdown>
      <DropdownToggle className="topbar-link btn fw-medium btn-link drop-arrow-none px-2" type="button">
        Mega Menu <Icon icon="chevron-down" className="ms-1" />
      </DropdownToggle>
      <DropdownMenu className="dropdown-menu-xxl p-0" style={{ minWidth: 740 }}>
        <div className="h-100" style={{
          maxHeight: 380,
          overflowY: 'auto'
        }}>
          <Row className="g-0">
            <Col md={4}>
              <div className="p-2">
                <h5 className="mb-1 fw-semibold fs-sm dropdown-header">
                  Dashboard &amp; Analytics
                </h5>
                <ul className="list-unstyled megamenu-list">
                  <li>
                    <DropdownItem href="">
                      <Icon icon="chevron-right" className="align-middle me-1 text-muted" />{" "}
                      Sales Dashboard
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem href="">
                      <Icon icon="chevron-right" className="align-middle me-1 text-muted" />{" "}
                      Marketing Dashboard
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem href="">
                      <Icon icon="chevron-right" className="align-middle me-1 text-muted" />{" "}
                      Finance Overview
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem href="">
                      <Icon icon="chevron-right" className="align-middle me-1 text-muted" />{" "}
                      User Analytics
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem href="">
                      <Icon icon="chevron-right" className="align-middle me-1 text-muted" />{" "}
                      Traffic Insights
                    </DropdownItem>
                  </li>
                </ul>
              </div>
            </Col>

            <Col md={4}>
              <div className="p-2">
                <h5 className="mb-1 fw-semibold fs-sm dropdown-header">
                  Project Management
                </h5>
                <ul className="list-unstyled megamenu-list">
                  <li>
                    <DropdownItem href="">
                      <span data-icon="minus" className="align-middle me-1 text-muted" />{" "}
                      Kanban Workflow
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem href="">
                      <span data-icon="minus" className="align-middle me-1 text-muted" />{" "}
                      Project Timeline
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem href="">
                      <span data-icon="minus" className="align-middle me-1 text-muted" />{" "}
                      Task Management
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem href="">
                      <span data-icon="minus" className="align-middle me-1 text-muted" />{" "}
                      Team Members
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem href="">
                      <span data-icon="minus" className="align-middle me-1 text-muted" />{" "}
                      Assignments
                    </DropdownItem>
                  </li>
                </ul>
              </div>
            </Col>

            <Col md={4}>
              <div className="p-2 bg-light bg-opacity-50">
                <h5 className="mb-1 fw-semibold fs-sm dropdown-header">
                  User Management
                </h5>
                <ul className="list-unstyled megamenu-list">
                  <li>
                    <DropdownItem href="">
                      <span data-icon="chevron-right" className="align-middle me-1 text-muted" />{" "}
                      User Profiles
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem href="">
                      <span data-icon="chevron-right" className="align-middle me-1 text-muted" />{" "}
                      Access Control
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem href="">
                      <span data-icon="chevron-right" className="align-middle me-1 text-muted" />{" "}
                      Security Settings
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem href="">
                      <span data-icon="chevron-right" className="align-middle me-1 text-muted" />{" "}
                      User Groups
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem href="">
                      <span data-icon="chevron-right" className="align-middle me-1 text-muted" />{" "}
                      Authentication{" "}
                    </DropdownItem>
                  </li>
                </ul>
              </div>
            </Col>
          </Row>
        </div>
      </DropdownMenu>
    </Dropdown>
  </div>;
};
export default Megamenu;