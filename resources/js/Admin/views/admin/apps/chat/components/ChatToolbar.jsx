import user3 from '@admin/assets/images/users/user-3.jpg';
import Icon from '@admin/components/wrappers/Icon';
import { Button, Dropdown, DropdownToggle, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from 'react-bootstrap';
import { useToggle } from 'usehooks-ts';
const ChatToolbar = () => {
  const [showVideo, toggleVideo] = useToggle();
  const [showAudio, toggleAudio] = useToggle();
  return <>
      <div className="d-flex align-items-center gap-1">
        <button className="btn btn-default btn-icon" onClick={toggleVideo}>
          <Icon icon="video" className="fs-lg" />
        </button>

        <button className="btn btn-default btn-icon" onClick={toggleAudio}>
          <Icon icon="phone-call" className="fs-lg" />
        </button>

        <Dropdown align="end">
          <DropdownToggle as="button" className="btn btn-default btn-icon drop-arrow-none">
            <Icon icon="dots-vertical" className="fs-lg" />
          </DropdownToggle>

          <Dropdown.Menu>
            <Dropdown.Item>
              <Icon icon="user" className="me-2" /> View Profile
            </Dropdown.Item>
            <Dropdown.Item>
              <Icon icon="bell-off" className="me-2" /> Mute Notifications
            </Dropdown.Item>
            <Dropdown.Item>
              <Icon icon="trash" className="me-2" /> Delete Chat
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      <Modal show={showVideo} onHide={toggleVideo} centered size="xl" contentClassName="bg-dark text-white">
        <ModalHeader closeButton className="border-0">
          <ModalTitle id="videoCallModalLabel">Starting Video Call</ModalTitle>
        </ModalHeader>

        <ModalBody className="d-flex flex-column align-items-center justify-content-center text-center py-5">
          <div className="mb-4">
            <img src={user3} className="rounded-circle shadow" alt="User Photo" />
          </div>

          <h3 className="fw-semibold mb-1">Alex Johnson</h3>
          <p className="text-muted mb-4">Connecting to call...</p>

          <div className="d-flex gap-2">
            <Button variant="light" className="d-flex align-items-center gap-2">
              <Icon icon="video" />
              Camera On
            </Button>
            <Button variant="light" className="d-flex align-items-center gap-2">
              <Icon icon="microphone" />
              Mic On
            </Button>
            <Button variant="danger" className="d-flex align-items-center gap-2" onClick={toggleVideo}>
              <Icon icon="phone-call" />
              End Call
            </Button>
          </div>
        </ModalBody>

        <ModalFooter className="border-0 justify-content-center">
          <span className="text-muted fst-italic">Make sure your devices are connected before starting the call</span>
        </ModalFooter>
      </Modal>

      <Modal show={showAudio} onHide={toggleAudio} centered contentClassName="bg-dark text-white">
        <ModalHeader closeButton className="border-0">
          <ModalTitle id="audioCallModalLabel">Starting Audio Call</ModalTitle>
        </ModalHeader>

        <ModalBody className="d-flex flex-column align-items-center justify-content-center text-center py-5">
          <div className="mb-4">
            <img src={user3} className="rounded-circle shadow" alt="User Photo" />
          </div>

          <h4 className="fw-semibold mb-1">Alex Johnson</h4>
          <p className="text-muted mb-4">Calling...</p>

          <div className="d-flex gap-2">
            <Button variant="light" className="d-flex align-items-center gap-2">
              <Icon icon="microphone" />
              Mic On
            </Button>
            <Button variant="light" className="d-flex align-items-center gap-2">
              <Icon icon="volume" />
              Speaker On
            </Button>
            <Button variant="danger" className="d-flex align-items-center gap-2" onClick={toggleAudio}>
              <Icon icon="phone-call" />
              End Call
            </Button>
          </div>
        </ModalBody>

        <ModalFooter className="border-0 justify-content-center">
          <span className="text-muted fst-italic">Ensure your microphone is working properly</span>
        </ModalFooter>
      </Modal>
    </>;
};
export default ChatToolbar;