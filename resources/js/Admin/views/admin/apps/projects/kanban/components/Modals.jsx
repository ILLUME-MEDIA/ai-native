import Icon from '@admin/components/wrappers/Icon';
import { Button, Col, FormControl, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
import { Controller } from 'react-hook-form';
import { KanbanTaskData } from './data';
import { useKanbanContext } from './useKanbanContext';
const Modals = () => {
  const {
    newTaskModal,
    taskForm,
    taskFormData,
    sectionFormData,
    sectionModal,
    sectionForm
  } = useKanbanContext();
  return <>
      <Modal show={newTaskModal.open} onHide={newTaskModal.toggle} tabIndex={-1} role="dialog" centered>
        <form onSubmit={taskFormData ? taskForm.editRecord : taskForm.newRecord}>
          <ModalHeader closeButton>
            <ModalTitle className="fw-semibold">{taskFormData ? 'Edit Task' : 'Add New Task'}</ModalTitle>
          </ModalHeader>

          <ModalBody>
            <Row>
              <Col sm={12} className="mb-3">
                <FormLabel>Task Title</FormLabel>
                <Controller control={taskForm.control} name="title" rules={{
                required: 'Task title is required'
              }} render={({
                field
              }) => <FormControl {...field} value={field.value ?? ''} placeholder="Enter task name..." />} />
              </Col>

              <Col sm={12} className="mb-3">
                <FormLabel>Assign To</FormLabel>
                <Controller control={taskForm.control} name="assignee" rules={{
                required: 'Please select an assignee'
              }} render={({
                field
              }) => <FormSelect value={field.value?.name || ''} onChange={e => {
                const selected = KanbanTaskData.find(m => m.assignee.name === e.target.value)?.assignee;
                field.onChange(selected);
              }}>
                      <option value="" disabled>
                        Select user
                      </option>

                      {KanbanTaskData.slice(0, 5).map((member, idx) => <option key={idx} value={member.assignee.name}>
                          {member.assignee.name}
                        </option>)}
                    </FormSelect>} />
              </Col>

              <Col sm={12} className="mb-3">
                <FormLabel>Priority</FormLabel>
                <Controller control={taskForm.control} name="priority" render={({
                field
              }) => <FormSelect {...field}>
                      <option value="normal">Normal</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </FormSelect>} />
              </Col>

              <Col sm={12} className="mb-3">
                <FormLabel>Description</FormLabel>
                <Controller control={taskForm.control} name="description" render={({
                field
              }) => <FormControl {...field} as="textarea" rows={3} placeholder="Brief details..." />} />
              </Col>
            </Row>
          </ModalBody>

          <ModalFooter>
            <Button variant="light" onClick={() => newTaskModal.toggle} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Icon icon="check" className="me-1" />
              {taskFormData ? 'Update Task' : 'Save Task'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal show={sectionModal.open} aria-hidden={sectionModal.open} onHide={sectionModal.toggle} tabIndex={-1} role="dialog">
        <form onSubmit={sectionFormData ? sectionForm.editRecord : sectionForm.newRecord}>
          <ModalHeader closeButton>
            <ModalTitle className="m-0">{sectionFormData ? 'Edit New Section' : 'Add New Section'}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <Row>
              <Col sm={12}>
                <FormLabel>Title</FormLabel>
                <Controller control={sectionForm.control} name="sectionTitle" rules={{
                required: 'Task title is required'
              }} render={({
                field
              }) => <>
                      <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Enter task title" />
                    </>} />
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" type="submit">
              {sectionFormData ? 'Update' : 'Save'}
            </Button>
            <Button variant="danger" onClick={() => sectionModal.toggle()} type="button">
              Close
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>;
};
export default Modals;