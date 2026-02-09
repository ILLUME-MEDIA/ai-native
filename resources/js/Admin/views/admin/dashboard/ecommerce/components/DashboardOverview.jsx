import email from "@admin/assets/images/svg/email-campaign.svg";
import { CountUp } from "@admin/components/wrappers/CountUp";
import Icon from "@admin/components/wrappers/Icon";
import { useEffect, useState } from "react";
import { Card, CardBody, Col, Row } from "react-bootstrap";
import { stateData } from "./data";
import { META_DATA } from "@admin/config/constants";
const DashboardOverview = () => {
  const [currentTime, setCurrentTime] = useState(null);
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>
      <Row className="h-100">
        <Col lg="3" md="6" xxl="6">
          <Card className="card-h-100 overflow-hidden">
            <CardBody className="pb-0">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="overflow-hidden flex-shrink-0">
                  <h3 className="fw-normal text-reset fs-20 lh-base">
                    <span className="text-muted fs-base text-uppercase h5">
                      Good Day,
                    </span>{" "}
                    <br /> <b>{META_DATA.username}!</b>
                  </h3>
                </div>
                <div className="flex-grow-1 text-end">
                  <img className="d-none d-xxl-inline-block" src={email} width={110} alt="Generic placeholder image" />
                </div>
              </div>
            </CardBody>
            <CardBody className="d-flex align-items-center p-2 bg-light bg-opacity-50">
              <p className="d-flex align-items-center justify-content-between w-100 mb-0">
                <span className="me-2">
                  <Icon icon="calendar" className="fs-15 align-middle" />
                  <span className="align-middle ms-1 fw-semibold">
                    {new Date().toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })}
                  </span>
                </span>
                <span className="text-nowrap">
                  <Icon icon="clock" className="fs-15 align-middle" />
                  <span className="align-middle ms-1 fw-semibold" id="clock-widget">
                    {currentTime ? currentTime.toLocaleTimeString() : "--:--:--"}
                  </span>
                </span>
              </p>
            </CardBody>
          </Card>
        </Col>
        {stateData.map((item, idx) => <Col lg="3" md="6" xxl="6" key={idx}>
            <Card className="card-h-100">
              <CardBody>
                <div className="d-flex justify-content-between">
                  <div>
                    <h5 className="text-muted fs-base text-uppercase" title="Number of Orders">
                      {item.title}
                    </h5>
                    <h3 className="my-3 py-1 fw-semibold">
                      <CountUp start={0} end={item.value} duration={10} prefix={item.prefix} suffix={item.suffix} />
                    </h3>
                    <p className="mb-0 text-muted">
                      <span className={`${item.title === "Orders" ? "text-danger" : item.title === "Revenue" ? "text-danger" : "text-success"}  me-2`}>
                        {item.change < 0 ? <Icon icon="arrow-down" /> : <Icon icon="arrow-up" />}
                        {item.change}%
                      </span>
                      <span className="text-nowrap">Since last month</span>
                    </p>
                  </div>
                  <div className="avatar-md flex-shrink-0">
                    <span className="avatar-title bg-primary-subtle rounded-circle fs-22">
                      <Icon icon={item.icon} className="text-primary" />
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>)}
      </Row>
    </>;
};
export default DashboardOverview;