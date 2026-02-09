import ColumnTable from './ColumnTable';
import { Button, Card, CardBody, CardHeader, Col, Row } from 'react-bootstrap';
const Table = () => {
  return <>
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader className="justify-content-between">
              <h4 className="card-title">Example</h4>
            </CardHeader>
            <CardBody>
              <div className="alert alert-warning alert-dismissible fade show mb-4" role="alert">
                <strong>Note:</strong>
                This is a jQuery-based plugin, so you need to include jQuery for it to work.
                <Button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" />
              </div>

              <ColumnTable />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Table;