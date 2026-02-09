import user1 from '@admin/assets/images/users/user-1.jpg';
import user10 from '@admin/assets/images/users/user-10.jpg';
import user2 from '@admin/assets/images/users/user-2.jpg';
import user3 from '@admin/assets/images/users/user-3.jpg';
import user4 from '@admin/assets/images/users/user-4.jpg';
import user5 from '@admin/assets/images/users/user-5.jpg';
import user6 from '@admin/assets/images/users/user-6.jpg';
import user7 from '@admin/assets/images/users/user-7.jpg';
import user8 from '@admin/assets/images/users/user-8.jpg';
import user9 from '@admin/assets/images/users/user-9.jpg';
export const ticketData = [{
  id: '#SUP-2451',
  requestedBy: {
    name: 'Emily Clark',
    image: user3
  },
  subject: 'Unable to login with 2FA',
  agent: {
    name: 'Daniel Ray',
    image: user2
  },
  priority: 'high',
  status: 'pending',
  createdAtDate: '04 Aug, 2025',
  createdAtTime: '11:30 AM',
  dueDate: '08 Aug, 2025'
}, {
  id: '#SUP-2517',
  requestedBy: {
    name: 'Lucas Graham',
    image: user9
  },
  subject: 'Cannot upload profile image',
  agent: {
    name: 'Sarah Lee',
    image: user1
  },
  priority: 'medium',
  status: 'in-progress',
  createdAtDate: '05 Aug, 2025',
  createdAtTime: '2:05 PM',
  dueDate: '10 Aug, 2025'
}, {
  id: '#SUP-2518',
  requestedBy: {
    name: 'Nina Patel',
    image: user4
  },
  subject: 'Incorrect invoice total shown',
  agent: {
    name: 'Alex Morgan',
    image: user8
  },
  priority: 'high',
  status: 'pending',
  createdAtDate: '05 Aug, 2025',
  createdAtTime: '10:42 AM',
  dueDate: '07 Aug, 2025'
}, {
  id: '#SUP-2519',
  requestedBy: {
    name: 'Michael Foster',
    image: user6
  },
  subject: 'Website not loading on Safari',
  agent: {
    name: 'Jessica Hughes',
    image: user5
  },
  priority: 'low',
  status: 'resolved',
  createdAtDate: '04 Aug, 2025',
  createdAtTime: '6:20 PM',
  dueDate: '06 Aug, 2025'
}, {
  id: '#SUP-2520',
  requestedBy: {
    name: 'Isabella Reed',
    image: user7
  },
  subject: 'Cannot change account email',
  agent: {
    name: 'Daniel Ray',
    image: user2
  },
  priority: 'medium',
  status: 'in-progress',
  createdAtDate: '03 Aug, 2025',
  createdAtTime: '9:50 AM',
  dueDate: '08 Aug, 2025'
}, {
  id: '#SUP-2521',
  requestedBy: {
    name: 'Olivia White',
    image: user1
  },
  subject: "Can't access dashboard after update",
  agent: {
    name: 'James Carter',
    image: user9
  },
  priority: 'high',
  status: 'escalated',
  createdAtDate: '05 Aug, 2025',
  createdAtTime: '7:45 AM',
  dueDate: '06 Aug, 2025'
}, {
  id: '#SUP-2522',
  requestedBy: {
    name: 'Emma King',
    image: user10
  },
  subject: 'Feature request: export as PDF',
  agent: {
    name: 'Harper Wells',
    image: user3
  },
  priority: 'low',
  status: 'closed',
  createdAtDate: '01 Aug, 2025',
  createdAtTime: '4:10 PM',
  dueDate: '05 Aug, 2025'
}, {
  id: '#SUP-2523',
  requestedBy: {
    name: 'Ava Sullivan',
    image: user1
  },
  subject: 'App freezes when uploading files',
  agent: {
    name: 'Liam Brooks',
    image: user4
  },
  priority: 'high',
  status: 'pending',
  createdAtDate: '05 Aug, 2025',
  createdAtTime: '1:20 PM',
  dueDate: '09 Aug, 2025'
}, {
  id: '#SUP-2524',
  requestedBy: {
    name: 'Sophie Bennett',
    image: user3
  },
  subject: 'Missing transaction history',
  agent: {
    name: 'Lucas Shaw',
    image: user6
  },
  priority: 'medium',
  status: 'in-progress',
  createdAtDate: '04 Aug, 2025',
  createdAtTime: '4:30 PM',
  dueDate: '08 Aug, 2025'
}, {
  id: '#SUP-2525',
  requestedBy: {
    name: 'Noah Allen',
    image: user4
  },
  subject: 'Feedback form submission error',
  agent: {
    name: 'Sophia Reed',
    image: user5
  },
  priority: 'low',
  status: 'resolved',
  createdAtDate: '03 Aug, 2025',
  createdAtTime: '12:00 PM',
  dueDate: '06 Aug, 2025'
}, {
  id: '#SUP-2526',
  requestedBy: {
    name: 'Ethan James',
    image: user5
  },
  subject: "Can't generate report summary",
  agent: {
    name: 'Chloe Adams',
    image: user7
  },
  priority: 'high',
  status: 'escalated',
  createdAtDate: '05 Aug, 2025',
  createdAtTime: '8:50 AM',
  dueDate: '07 Aug, 2025'
}, {
  id: '#SUP-2527',
  requestedBy: {
    name: 'Grace Carter',
    image: user8
  },
  subject: 'Feature request: Dark mode toggle',
  agent: {
    name: 'Daniel Ray',
    image: user2
  },
  priority: 'low',
  status: 'closed',
  createdAtDate: '02 Aug, 2025',
  createdAtTime: '5:25 PM',
  dueDate: '06 Aug, 2025'
}];
export const ticketStatData = [{
  value: 148,
  change: 3,
  title: 'Open Tickets',
  icon: 'ticket'
}, {
  value: 1289,
  change: 12,
  title: 'Resolved Tickets',
  icon: 'circle-check'
}, {
  value: 93,
  change: -2.1,
  title: 'Pending Tickets',
  icon: 'hourglass'
}, {
  value: 25,
  change: 1.8,
  title: 'Escalated Tickets',
  icon: 'alert-circle'
}, {
  value: 8.4,
  change: 0.5,
  title: 'Average Response Time',
  icon: 'clock',
  unit: 'hrs'
}];