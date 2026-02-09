import Icon from '@admin/components/wrappers/Icon';
import { SimpleBar } from '@admin/components/wrappers/SimpleBar';
import { Button, Card, CardBody, CardHeader, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { featureData } from './data';
import { Link } from 'react-router';
const OutlookRightPanel = () => {
  return <>
      <SimpleBar className="card mb-0 rounded-0 flex-grow-1 outlook-right-menu-content">
        <CardHeader className="d-lg-none d-flex">
          <button className="btn btn-sm btn-default btn-icon" type="button" data-bs-toggle="offcanvas" data-bs-target="#outlookSidebaroffcanvas" aria-controls="outlookSidebaroffcanvas">
            <Icon icon="menu-4" className="fs-lg" />
          </button>
        </CardHeader>
        <CardBody className="d-flex flex-column justify-content-between align-items-center h-100">
          <Row className="justify-content-center">
            <Col xl="8">
              <div className="mt-3">
                <div className="avatar avatar-sm rounded-circle mx-auto text-bg-dark">
                  <span className="avatar-title">
                    <Icon icon="sparkles" className="fs-md" />
                  </span>
                </div>
                <h3 className="mb-4 mt-2 text-center">How can I help, David Dev 👋?</h3>
                <div className="py-4">
                  <Row className="g-2">
                    {featureData.map((item, idx) => <Col md="4" key={idx}>
                        <Card className="card-h-100 rounded-3 shadow-none bg-light-subtle border border-dashed">
                          <CardBody>
                            <div className="avatar-lg mb-2 rounded-circle text-bg-light d-flex align-items-center justify-content-center">
                              <Icon icon={item.icon} className="fs-xxl" />
                            </div>
                            <p className="mb-0 text-muted">{item.title}</p>
                            <Link to={item.href} className="stretched-link" />
                          </CardBody>
                        </Card>
                      </Col>)}
                  </Row>
                </div>
              </div>
            </Col>
          </Row>
          <div className="w-100 text-center">
            <CardBody>
              <textarea className="form-control" id="exampleFormControlTextarea1" rows={4} placeholder="Enter message" />
              <div className="d-flex gap-1 mt-2 align-items-center">
                <OverlayTrigger placement="top" overlay={<Tooltip>Attach files</Tooltip>}>
                  <Button size="sm" className="btn-default btn-icon">
                    <Icon icon="paperclip" className="fs-sm" />
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger placement="top" overlay={<Tooltip>Insert link</Tooltip>}>
                  <Button size="sm" className="btn-default btn-icon">
                    <Icon icon="link" className="fs-sm" />
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger placement="top" overlay={<Tooltip>Insert photo</Tooltip>}>
                  <Button size="sm" className="btn-default btn-icon">
                    <Icon icon="photo-up" className="fs-sm" />
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger placement="top" overlay={<Tooltip>Voice</Tooltip>}>
                  <Button size="sm" className="btn-default btn-icon">
                    <Icon icon="microphone" className="fs-sm" />
                  </Button>
                </OverlayTrigger>
                <Button variant="primary" size="sm" type="button" className="ms-auto">
                  <Icon icon="send-2" className="fs-sm me-1" />
                  Send
                </Button>
              </div>
            </CardBody>
          </div>
        </CardBody>
      </SimpleBar>
    </>;
};
export default OutlookRightPanel;