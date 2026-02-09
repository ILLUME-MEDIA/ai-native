import user2 from '@admin/assets/images/users/user-2.jpg';
import user5 from '@admin/assets/images/users/user-5.jpg';
import Icon from '@admin/components/wrappers/Icon';
import { SimpleBar } from '@admin/components/wrappers/SimpleBar';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, CardHeader, CardTitle, FormControl } from 'react-bootstrap';
import { messageData } from './data';
const ChatCard = () => {
  const [chatMessages, setChatMessages] = useState(messageData);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      const scrollEl = scrollRef.current.getScrollElement();
      if (scrollEl) {
        scrollEl.scrollTo({
          top: scrollEl.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [chatMessages]);
  const handleSend = e => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? 'pm' : 'am';
    const hour = h % 12 || 12;
    const min = m < 10 ? `0${m}` : m;
    const timeStr = `${hour}:${min} ${ampm}`;
    setChatMessages(prev => [...prev, {
      message: text,
      time: timeStr,
      fromUser: true,
      image: user2
    }]);
    setInput('');
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        message: text,
        time: timeStr,
        fromUser: false,
        image: user5
      }]);
    }, 1000);
  };
  return <Card>
      <CardHeader>
        <CardTitle as="h4">Chat</CardTitle>
      </CardHeader>

      <SimpleBar className="card-body py-0" style={{
      height: '380px'
    }} id="chat-container" ref={scrollRef}>
        {chatMessages.map((message, idx) => <div key={idx} className={`d-flex align-items-start gap-2 my-3 chat-item${message.fromUser ? ' text-end justify-content-end' : ''}`}>
            {!message.fromUser && <img src={message.image} className="avatar-md rounded-circle" alt="User" />}

            <div>
              <div className={`chat-message py-2 px-3 rounded ${message.fromUser ? 'bg-info-subtle' : 'bg-warning-subtle'}`}>{message.message}</div>
              <div className="text-muted fs-xs mt-1 d-inline-flex align-items-center gap-1">
                <Icon icon="clock" /> {message.time}
              </div>
            </div>

            {message.fromUser && <img src={message.image} className="avatar-md rounded-circle" alt="User" />}
          </div>)}
      </SimpleBar>

      <div className="card-footer bg-body-secondary border-top border-dashed border-bottom-0">
        <form className="d-flex gap-2" onSubmit={handleSend}>
          <div className="app-search flex-grow-1">
            <FormControl type="text" value={input} onChange={e => setInput(e.target.value)} className="bg-light-subtle border-light" placeholder="Enter message..." />
            <Icon icon="message" className="app-search-icon text-muted" />
          </div>
          <Button type="submit" variant="primary" className="btn-icon">
            <Icon icon="send-2" className="fs-xl" />
          </Button>
        </form>
      </div>
    </Card>;
};
export default ChatCard;