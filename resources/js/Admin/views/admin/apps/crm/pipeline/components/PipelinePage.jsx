import Icon from '@admin/components/wrappers/Icon';
import { SimpleBar } from '@admin/components/wrappers/SimpleBar';
import { toPascalCase } from '@admin/utils/helpers';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { Link } from 'react-router';
import { Button, Card, CardBody, CardHeader, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Form, FormControl, FormGroup, FormLabel, FormSelect, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap';
import { Controller } from 'react-hook-form';
import { pipelineSectionsData, pipelineTaskData } from './data';
import { PipelineProvider, usePipelineContext } from './usePipelineContext';
export const variants = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];
const PipelinePage = () => {
  return <PipelineProvider sectionsData={pipelineSectionsData} tasksData={pipelineTaskData}>
      <div className="outlook-box kanban-app">
        <Card className="h-100 mb-0 flex-grow-1">
          <PipelineHeader />
          <Board />
          <Modals />
        </Card>
      </div>
    </PipelineProvider>;
};
export default PipelinePage;
const PipelineHeader = () => {
  const {
    sectionModal
  } = usePipelineContext();
  return <CardHeader className=" d-none d-lg-flex border-light align-items-center gap-2">
      <div className="app-search">
        <input type="search" className="form-control" placeholder="Search tasks..." />
        <Icon icon="search" className="app-search-icon text-muted" />
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        <div className="app-search">
          <FormSelect className="form-control">
            <option>Stage</option>
            <option value="Qualification">Qualification</option>
            <option value="Proposal Sent">Proposal Sent</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </FormSelect>
          <Icon icon="arrows-shuffle" className="app-search-icon text-muted" />
        </div>

        <div className="app-search">
          <FormSelect className="form-control">
            <option>Closing Date</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
          </FormSelect>
          <Icon icon="calendar-event" className="app-search-icon text-muted" />
        </div>
      </div>

      <button type="submit" className="btn btn-secondary ms-lg-auto" onClick={() => sectionModal.toggle()}>
        <Icon icon="plus" className="me-1" /> Add New Deal
      </button>
    </CardHeader>;
};
const Board = () => {
  const {
    onDragEnd,
    sections,
    getAllTasksPerSection,
    newTaskModal
  } = usePipelineContext();
  return <CardBody className="p-0">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-content">
          {sections.map(section => <Droppable key={section.id} droppableId={section.id}>
              {provided => <div className={`kanban-board bg-${section.variant} bg-opacity-10`} ref={provided.innerRef}>
                  <div className="kanban-item py-2 px-3 d-flex align-items-center">
                    <h5 className="m-0">
                      {section.title} ({getAllTasksPerSection(section.id).length})
                    </h5>
                    <Button className="ms-auto btn btn-sm btn-icon rounded-circle btn-primary" onClick={() => newTaskModal.toggle(section.id)}>
                      <Icon icon="plus" />
                    </Button>
                  </div>
                  <SimpleBar className="kanban-board-group px-2">
                    <ul>
                      {getAllTasksPerSection(section.id).map((task, idx) => <Draggable draggableId={task.id} index={idx} key={task.id}>
                          {provided => <li className="kanban-item" ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                              <TaskItem item={task} />
                            </li>}
                        </Draggable>)}
                      {provided.placeholder}
                    </ul>
                  </SimpleBar>
                </div>}
            </Droppable>)}
        </div>
      </DragDropContext>
    </CardBody>;
};
const TaskItem = ({
  item
}) => {
  const {
    newTaskModal,
    taskForm
  } = usePipelineContext();
  return <>
      <Card className="shadow mb-2">
        <CardBody>
          <div className="d-flex align-items-center mb-2">
            <div>
              <h5 className="mb-0 fw-semibold">
                <Link to="" className="link-reset">
                  {item.title}
                </Link>
              </h5>
              <small className="text-muted">{item.company}</small>
            </div>
            <Dropdown className="ms-auto">
              <DropdownToggle className="btn btn-icon btn-sm drop-arrow-none btn-ghost-light text-muted content-none" type="button">
                <Icon icon="dots-vertical" className="fs-xl" />
              </DropdownToggle>
              <DropdownMenu align="end">
                <DropdownItem>
                  <Icon icon="share" className="me-2" />
                  Share
                </DropdownItem>
                <DropdownItem onClick={() => newTaskModal.toggle(item.sectionId, item.id)}>
                  <Icon icon="edit" className="me-2" />
                  Edit
                </DropdownItem>
                <DropdownItem>
                  <Icon icon="user" className="me-2" />
                  Assign
                </DropdownItem>
                <DropdownItem className="text-danger" onClick={() => taskForm.deleteRecord(item.id)}>
                  <Icon icon="trash" className="me-2" />
                  Delete
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-1">
              <img src={item.user} className="rounded-circle avatar-xs" alt="Mark Allen" />
              <span className="fw-medium text-muted fs-sm">{item.userName}</span>
            </div>
            <div className="d-flex align-items-center gap-1">
              <Icon icon="calendar-clock" className="text-muted fs-lg" />
              <h5 className="fs-base mb-0 fw-medium">{item.date}</h5>
            </div>
          </div>
          <div className="mt-2">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2 fs-sm">
                <span className="d-flex align-items-center gap-1">
                  <Icon icon="message" className="text-muted fs-lg" /> {item.messages}
                </span>
                <span className="d-flex align-items-center gap-1">
                  <Icon icon="list-check" className="text-muted fs-lg" /> {item.tasks}
                </span>
              </div>
              <span className="fw-semibold">${item.amount}</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </>;
};
const Modals = () => {
  const {
    newTaskModal,
    taskForm,
    taskFormData,
    sectionFormData,
    sectionModal,
    sectionForm
  } = usePipelineContext();
  return <>
      <Modal show={newTaskModal.open} aria-hidden={newTaskModal.open} onHide={newTaskModal.toggle} centered>
        <Form onSubmit={taskFormData ? taskForm.editRecord : taskForm.newRecord}>
          <ModalHeader closeButton>
            <ModalTitle>{taskFormData ? 'Edit Deal' : 'Add New Deal'}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <FormGroup className="mb-3" controlId="taskTitle">
              <FormLabel>Title</FormLabel>
              <Controller control={taskForm.control} name="title" rules={{
              required: 'Task title is required'
            }} render={({
              field
            }) => <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Enter task title" />} />
            </FormGroup>

            <FormGroup className="mb-3" controlId="userName">
              <FormLabel>User Name</FormLabel>
              <Controller control={taskForm.control} name="userName" rules={{
              required: 'username  is required'
            }} render={({
              field
            }) => <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Enter user name" />} />
            </FormGroup>

            <FormGroup className="mb-3" controlId="companyName">
              <FormLabel>Company Name</FormLabel>
              <Controller control={taskForm.control} name="companyName" rules={{
              required: 'Company name  is required'
            }} render={({
              field
            }) => <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Enter company name" />} />
            </FormGroup>
            <FormGroup className="mb-3" controlId="amount">
              <FormLabel>Amount</FormLabel>
              <Controller control={taskForm.control} name="amount" rules={{
              required: 'Enter amount'
            }} render={({
              field
            }) => <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Enter amount" />} />
            </FormGroup>
            <FormGroup className="mb-0" controlId="taskDate">
              <FormLabel>Date</FormLabel>
              <Controller control={taskForm.control} name="date" rules={{
              required: 'Date is required'
            }} render={({
              field
            }) => <FormControl {...field} value={field.value ?? ''} type="date" />} />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => newTaskModal.toggle()}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {taskFormData ? 'Edit Deal' : 'Add Deal'}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal show={sectionModal.open} aria-hidden={sectionModal.open} onHide={sectionModal.toggle} tabIndex={-1} role="dialog">
        <form onSubmit={sectionFormData ? sectionForm.editRecord : sectionForm.newRecord}>
          <ModalHeader closeButton>
            <ModalTitle className="m-0">{sectionFormData ? 'Edit New Section' : 'Add New Section'}</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <Row>
              <Col sm={12} className="mb-3">
                <FormLabel>Title</FormLabel>
                <Controller control={sectionForm.control} name="sectionTitle" rules={{
                required: 'Task title is required'
              }} render={({
                field
              }) => <>
                      <FormControl {...field} value={field.value ?? ''} type="text" placeholder="Enter task title" />
                    </>} />
              </Col>
              <Col sm={12}>
                <FormLabel>Variant</FormLabel>
                <Controller control={sectionForm.control} name="sectionVariant" rules={{
                required: 'Select a Variant'
              }} render={({
                field
              }) => <Form.Select {...field} value={field.value || 'info'} onChange={e => {
                const idx = e.target.selectedIndex;
                field.onChange(variants[idx]);
              }}>
                      {variants.map((variant, idx) => <option value={variant} key={idx}>
                          {toPascalCase(variant)}
                        </option>)}
                    </Form.Select>} />
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