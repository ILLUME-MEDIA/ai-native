import { SimpleBar } from '@admin/components/wrappers/SimpleBar';
import { Icon as IconifyIcon } from '@iconify/react';
import { Button, Card, CardFooter, CardHeader, CardTitle, FormControl } from 'react-bootstrap';
import { chatMessageData, chatUser } from './data';
const Chat = () => {
  const currentUser = chatUser[1];
  return <Card>
      <CardHeader>
        <CardTitle as="h4">Chat</CardTitle>
      </CardHeader>

      <SimpleBar className="card-body py-0" style={{
      height: 360
    }} id="chat-container">
        {chatMessageData.map((item, index) => {
        const isMe = item.user.name === currentUser.name;
        return <div key={index} className={`d-flex align-items-start gap-2 my-3 chat-item ${isMe ? 'justify-content-end text-end' : ''}`}>
              {!isMe && <img src={item.user.image} alt={item.user.name} className="avatar-md rounded-circle" />}
              <div>
                <div className={`chat-message py-2 px-3 rounded ${isMe ? 'bg-info-subtle' : 'bg-warning-subtle'}`}>{item.message}</div>
                <div className="text-muted fs-xs mt-1">
                  <IconifyIcon icon="tabler:clock" /> {item.time}
                </div>
              </div>
              {isMe && <img src={item.user.image} alt={item.user.name} className="avatar-md rounded-circle" />}
            </div>;
      })}
      </SimpleBar>

      <CardFooter className="bg-body-secondary border-top border-dashed border-bottom-0">
        <div className="d-flex gap-2">
          <div className="app-search flex-grow-1">
            <FormControl type="text" className="bg-light-subtle border-light" placeholder="Enter message..." />
            <IconifyIcon icon="lucide:message-square" className="app-search-icon text-muted" />
          </div>
          <Button variant="primary" className="btn-icon">
            <IconifyIcon icon="tabler:send-2" className="fs-xl" />
          </Button>
        </div>
      </CardFooter>
    </Card>;
};
export default Chat;