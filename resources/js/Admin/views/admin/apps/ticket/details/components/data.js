import user2 from '@admin/assets/images/users/user-2.jpg';
import user5 from '@admin/assets/images/users/user-5.jpg';
export const messageData = [{
  message: 'Hey! Are you available for a quick call? 📞',
  time: '08:55 am',
  fromUser: false,
  image: user5
}, {
  message: 'Sure, give me 5 minutes. Just wrapping something up.',
  time: '08:57 am',
  fromUser: true,
  image: user2
}, {
  message: "Perfect. Let me know when you're ready 👍",
  time: '08:58 am',
  fromUser: false,
  image: user5
}, {
  message: 'Ready now. Calling you!',
  time: '09:00 am',
  fromUser: true,
  image: user2
}, {
  message: 'Thanks for your time earlier!',
  time: '09:45 am',
  fromUser: false,
  image: user5
}, {
  message: 'Of course! It was a productive discussion.',
  time: '09:46 am',
  fromUser: true,
  image: user2
}, {
  message: 'I’ll send over the updated files by noon.',
  time: '09:50 am',
  fromUser: false,
  image: user5
}];
export const timelineData = [{
  time: 'Just Now',
  bulletClassName: 'bg-success',
  title: 'Ticket Resolved',
  description: 'Agent closed the ticket after applying a patch for the file upload freeze issue.',
  author: 'Liam Brooks'
}, {
  time: 'Today, 10:40 AM',
  bulletClassName: 'bg-info',
  title: 'Status Changed to "In Progress"',
  description: 'Ticket was picked up by the assigned agent for investigation.',
  author: 'Liam Brooks'
}, {
  time: 'Yesterday, 4:15 PM',
  bulletClassName: 'bg-warning',
  title: 'User Comment Added',
  description: 'User emphasized urgency due to impact on production file uploads.',
  author: 'Ava Sullivan'
}, {
  time: '02 Aug, 2025 - 3:00 PM',
  bulletClassName: 'bg-danger',
  title: 'Ticket Created',
  description: 'Ticket submitted regarding the app freezing on file upload.',
  author: 'Ava Sullivan'
}];