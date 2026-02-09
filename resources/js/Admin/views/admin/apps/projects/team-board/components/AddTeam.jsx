import Icon from '@admin/components/wrappers/Icon';
import { Button, Form, FormControl, FormGroup, FormLabel, FormSelect, FormText, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from 'react-bootstrap';
import { useToggle } from 'usehooks-ts';
const AddTeamModal = () => {
  const [show, toggleModal] = useToggle();
  return <>
      <Button variant="success" onClick={toggleModal}>
        <Icon icon="plus" className="me-1" /> Add New Team
      </Button>
      <Modal show={show} onHide={toggleModal} centered>
        <ModalHeader closeButton>
          <ModalTitle as="h5" className="fw-semibold">
            Add New Team
          </ModalTitle>
        </ModalHeader>

        <ModalBody>
          <Form id="teamForm">
            <FormGroup className="mb-3">
              <FormLabel>Team Name</FormLabel>
              <FormControl type="text" placeholder="e.g., Creative Design Team" required />
            </FormGroup>

            <FormGroup className="mb-3">
              <FormLabel>Team Code</FormLabel>
              <FormControl type="text" placeholder="e.g., IT-01" required />
            </FormGroup>

            <FormGroup className="mb-3">
              <FormLabel>Status</FormLabel>
              <FormSelect defaultValue="New">
                <option value="New">New</option>
                <option value="Active">Active</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Busy">Busy</option>
                <option value="Stable">Stable</option>
              </FormSelect>
            </FormGroup>

            <FormGroup className="mb-3">
              <FormLabel>Team Members</FormLabel>
              <FormSelect multiple>
                <option value="1">Liam Carter</option>
                <option value="2">Ava Mitchell</option>
                <option value="3">Noah Parker</option>
                <option value="4">Emma Scott</option>
                <option value="5">Logan Brooks</option>
                <option value="6">Sophie Adams</option>
                <option value="7">Ethan Hall</option>
              </FormSelect>
              <FormText>Hold Ctrl (Windows) or Cmd (Mac) to select multiple users.</FormText>
            </FormGroup>

            <FormGroup className="mb-0">
              <FormLabel>Description</FormLabel>
              <FormControl as="textarea" rows={3} placeholder="Brief team responsibilities..." />
            </FormGroup>
          </Form>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onClick={toggleModal}>
            Cancel
          </Button>
          <Button variant="success">
            <Icon icon="check" className="me-1" />
            Save Team
          </Button>
        </ModalFooter>
      </Modal>
    </>;
};
export default AddTeamModal;