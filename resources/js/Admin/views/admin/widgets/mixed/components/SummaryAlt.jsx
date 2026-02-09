import { Icon as IconifyIcon } from "@iconify/react";
import { Card, CardBody, Col } from "react-bootstrap";
import { Link } from "react-router";
import { overviewData } from "./data";
const SummaryAlt = () => {
  return <>
      {overviewData.map((item, idx) => <Col xl="4" key={idx}>
          <Card className={`bg-${item.variant} bg-gradient border-0`}>
            <CardBody className="bg-flower" style={{
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right bottom"
        }}>
              <h4 className="text-white">{item.title}</h4>
              <p className="text-white text-opacity-75">{item.description}</p>
              <div className="d-flex gap-1">
                {item.actions.map((action, idx) => <Link to="" className={`btn btn-sm btn-${item.variant} bg-white bg-opacity-10`} key={idx}>
                    <IconifyIcon icon={action.icon} className="me-1" />{" "}
                    {action.label}
                  </Link>)}
              </div>
            </CardBody>
          </Card>
        </Col>)}
    </>;
};
export default SummaryAlt;