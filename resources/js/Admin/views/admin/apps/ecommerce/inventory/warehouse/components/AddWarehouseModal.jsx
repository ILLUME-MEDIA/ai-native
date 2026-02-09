import Icon from '@admin/components/wrappers/Icon';
import { Button, Col, Form, FormControl, FormLabel, FormSelect, InputGroup, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
function AddWarehouseModal({
  show,
  handleClose
}) {
  return <Modal show={show} onHide={handleClose} centered size="lg" aria-labelledby="addWarehouseModalLabel">
      <ModalHeader closeButton>
        <ModalTitle as="h5" className="fw-semibold">
          <Icon icon="building" className="me-2 text-danger" /> Add New Warehouse
        </ModalTitle>
      </ModalHeader>

      <Form>
        <ModalBody>
          <Row className="g-3">
            <Col md={6}>
              <FormLabel htmlFor="warehouseId" className="fw-semibold">
                Warehouse ID
              </FormLabel>
              <FormControl type="text" id="warehouseId" placeholder="#WH-002" />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="warehouseName" className="fw-semibold">
                Warehouse Name
              </FormLabel>
              <FormControl type="text" id="warehouseName" placeholder="North Region Hub" />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="warehouseLocation" className="fw-semibold">
                Location
              </FormLabel>
              <FormControl type="text" id="warehouseLocation" placeholder="Los Angeles, USA" />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="warehouseManager" className="fw-semibold">
                Manager Name
              </FormLabel>
              <FormControl type="text" id="warehouseManager" placeholder="Liam Parker" />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="warehouseEmail" className="fw-semibold">
                Manager Email
              </FormLabel>
              <FormControl type="email" id="warehouseEmail" placeholder="liam.parker@company.com" />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="warehousePhone" className="fw-semibold">
                Contact Number
              </FormLabel>
              <FormControl type="tel" id="warehousePhone" placeholder="+1 212 555 0184" />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="warehouseArea" className="fw-semibold">
                Total Area
              </FormLabel>
              <FormControl type="text" id="warehouseArea" placeholder="85,000 sq.ft" />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="warehouseCapacity" className="fw-semibold">
                Total Capacity
              </FormLabel>
              <FormControl type="text" id="warehouseCapacity" placeholder="40,000 units" />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="warehouseStock" className="fw-semibold">
                Current Stock
              </FormLabel>
              <FormControl type="text" id="warehouseStock" placeholder="12,500 units" />
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="warehouseValue" className="fw-semibold">
                Asset Value
              </FormLabel>
              <InputGroup>
                <InputGroup.Text>$</InputGroup.Text>
                <FormControl type="number" id="warehouseValue" placeholder="1.25M" />
              </InputGroup>
            </Col>

            <Col md={6}>
              <FormLabel htmlFor="warehouseStatus" className="fw-semibold">
                Status
              </FormLabel>
              <FormSelect id="warehouseStatus" defaultValue="Operational">
                <option>Operational</option>
                <option>Under Maintenance</option>
                <option>Closed</option>
              </FormSelect>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="danger" type="submit">
            <Icon icon="check" className="me-1" /> Save Warehouse
          </Button>
        </ModalFooter>
      </Form>
    </Modal>;
}
export default AddWarehouseModal;