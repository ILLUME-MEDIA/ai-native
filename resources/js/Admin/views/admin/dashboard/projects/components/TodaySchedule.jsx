import Flatpickr from '@admin/components/wrappers/Flatpickr';
import Icon from '@admin/components/wrappers/Icon';
import { Link } from 'react-router';
import { Button, Card, CardBody, CardTitle } from 'react-bootstrap';
import { scheduleData } from './data';
const TodaySchedule = () => {
  return <>
      <Card>
        <CardBody>
          <Flatpickr type="text" options={{
          dateFormat: 'd M, Y',
          defaultDate: 'today',
          inline: true
        }} className="form-control card-calendar-widget" />
          <CardTitle as="h4" className="my-3">
            Today's Schedule:
            <Link to="" className="float-end fs-sm">
              View All
            </Link>
          </CardTitle>
          <ul className="list-unstyled mt-1 mb-0">
            {scheduleData.map((item, idx) => <li className={idx === scheduleData.length - 1 ? '' : 'mb-3'} key={idx}>
                <div className="d-flex gap-2 align-items-center">
                  <div className="avatar-sm">
                    <span className={`avatar-title ${item.className} rounded-circle fs-22 rounded`}>
                      <Icon icon={item.icon} />
                    </span>
                  </div>
                  <div>
                    <p className="text-muted mb-1 fs-13">
                      <Icon icon="calendar" /> {item.time}
                    </p>
                    <h5 className="m-0 fs-14">{item.title}</h5>
                  </div>
                  <div className="ms-auto">
                    <Button size="sm" type="button" className="btn-default btn-icon">
                      <Icon icon="x" className="fs-md" />
                    </Button>
                  </div>
                </div>
              </li>)}
          </ul>
        </CardBody>
      </Card>
    </>;
};
export default TodaySchedule;