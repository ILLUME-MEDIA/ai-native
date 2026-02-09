import Icon from '@admin/components/wrappers/Icon';
import { SimpleBar } from '@admin/components/wrappers/SimpleBar';
import { Card, CardBody, CardHeader, CardTitle, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import { browserData } from './data';
const SessionByBrowser = () => {
  return <>
      <Card>
        <CardHeader className="justify-content-between">
          <CardTitle as="h4">Sessions by Browser</CardTitle>
          <Dropdown className="ms-auto">
            <DropdownToggle className="btn btn-sm btn-default btn-icon content-none">
              <Icon icon="dots-vertical" className="fs-lg" />
            </DropdownToggle>
            <DropdownMenu align="end">
              <DropdownItem>
                <Icon icon="report" className="me-2" /> View Browser Report
              </DropdownItem>
              <DropdownItem>
                <Icon icon="download" className="me-2" /> Export Session Data
              </DropdownItem>
              <DropdownItem>
                <Icon icon="filter-2" className="me-2" /> Filter Browsers
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem className="text-danger">
                <Icon icon="trash" className="me-2" /> Remove Widget
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody className="py-2 px-0">
          <SimpleBar className="px-2" style={{
          height: 364
        }}>
            {browserData.map((item, idx) => <div className="d-flex justify-content-between align-items-center p-2" key={idx}>
                <div>
                  <img src={item.image} alt="user-image" className="me-1" height={26} />
                  <span className="align-middle fw-semibold fs-md">{item.name}</span>
                </div>
                <span className="fw-semibold text-muted float-end">{item.usage}%</span>
                <span className="fw-semibold text-muted float-end">
                  {item.change > 0 ? <Icon icon="arrow-up" className="text-success" /> : <Icon icon="arrow-down" className="text-danger" />}
                  {Math.abs(item.change)}%
                </span>
              </div>)}
          </SimpleBar>
        </CardBody>
      </Card>
    </>;
};
export default SessionByBrowser;