import user1 from '@admin/assets/images/users/user-1.jpg';
import user10 from '@admin/assets/images/users/user-10.jpg';
import user2 from '@admin/assets/images/users/user-2.jpg';
import user3 from '@admin/assets/images/users/user-3.jpg';
import user4 from '@admin/assets/images/users/user-4.jpg';
import user5 from '@admin/assets/images/users/user-5.jpg';
import user6 from '@admin/assets/images/users/user-6.jpg';
export const teamMemberData = [{
  image: user3,
  name: 'Ava Brooks',
  role: 'UI/UX Designer',
  href: '/pages/profile'
}, {
  image: user4,
  name: 'Liam Carter',
  role: 'Frontend Developer',
  href: '/pages/profile'
}, {
  image: user5,
  name: 'Sophia Lee',
  role: 'Project Manager',
  href: '/pages/profile'
}, {
  image: user6,
  name: 'Noah Kim',
  role: 'Backend Developer',
  href: '/pages/profile'
}];
export const fileData = [{
  icon: 'file-text',
  name: 'Project-Brief.pdf',
  size: 210000
}, {
  icon: 'music',
  name: 'Team-Intro.mp3',
  size: 5600000
}];
export const commentData = [{
  user: {
    name: 'Daniel West',
    image: user6
  },
  date: '14 Apr 2025',
  time: '04:15PM',
  message: 'You can also clear the browser cache or try a different browser. We had a similar issue with Chrome extensions interfering before.'
}, {
  user: {
    name: 'Nina Bryant',
    image: user10
  },
  date: '16 Apr 2025',
  time: '08:04AM',
  message: "The System Status Page has been updated. We're actively monitoring and will release a patch within 24 hours.",
  reply: [{
    user: {
      name: 'Daniel West',
      image: user6
    },
    date: '16 Apr 2025',
    time: '08:30AM',
    message: "Thanks for the update! We'll notify the customers and let them know the issue is being resolved."
  }]
}];
export const activityData = [{
  user: {
    name: 'Daniel Martinez',
    image: user1
  },
  action: 'uploaded a revised contract file.',
  datetime: 'Today 10:15 am - 24 Apr, 2025',
  time: '5m ago'
}, {
  user: {
    name: 'Nina Patel',
    image: user2
  },
  action: 'commented on your design update.',
  datetime: 'Today 8:00 am - 24 Apr, 2025',
  time: '2h ago'
}, {
  user: {
    name: 'Jason Lee',
    image: user3
  },
  action: 'completed the feedback review.',
  datetime: 'Yesterday 6:10 pm - 23 Apr, 2025',
  time: '16h ago'
}, {
  user: {
    name: 'Emma Davis',
    image: user4
  },
  action: 'shared a link in the marketing group chat.',
  datetime: 'Yesterday 3:25 pm - 23 Apr, 2025',
  time: '19h ago'
}, {
  user: {
    name: 'Leo Zhang',
    image: user5
  },
  action: 'sent you a private message.',
  datetime: '2 days ago 11:45 am - 22 Apr, 2025',
  time: '30h ago',
  message: 'Let’s sync up on the product roadmap tomorrow afternoon, does 2 PM work for you?'
}];