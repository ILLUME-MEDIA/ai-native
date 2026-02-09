import user1 from '@admin/assets/images/users/user-1.jpg';
import user10 from '@admin/assets/images/users/user-10.jpg';
import user3 from '@admin/assets/images/users/user-3.jpg';
import user4 from '@admin/assets/images/users/user-4.jpg';
import user5 from '@admin/assets/images/users/user-5.jpg';
import user6 from '@admin/assets/images/users/user-6.jpg';
import user7 from '@admin/assets/images/users/user-7.jpg';
import user8 from '@admin/assets/images/users/user-8.jpg';
import user9 from '@admin/assets/images/users/user-9.jpg';
export const kanbanSectionData = [{
  id: '501',
  title: 'To Do'
}, {
  id: '502',
  title: 'In Progress'
}, {
  id: '503',
  title: 'In Review'
}, {
  id: '504',
  title: 'Done'
}];
export const KanbanTaskData = [{
  id: '601',
  sectionId: '501',
  status: 'todo',
  priority: 'high',
  title: 'Design onboarding flow for new user sign-up journey.',
  assignee: {
    name: 'Ava Mitchell',
    image: user5
  },
  stats: {
    time: '4 Days',
    task: 3,
    link: 2,
    messages: 9
  }
}, {
  id: '602',
  sectionId: '501',
  status: 'todo',
  priority: 'normal',
  title: 'Create dark/light theme switcher with local storage.',
  assignee: {
    name: 'Mia Johnson',
    image: user8
  },
  stats: {
    time: '2 Days',
    task: 4,
    link: 1,
    messages: 6
  }
}, {
  id: '603',
  sectionId: '501',
  status: 'todo',
  priority: 'medium',
  title: 'Write documentation for project setup and deployment.',
  assignee: {
    name: 'Emma Scott',
    image: user9
  },
  stats: {
    time: '6 Days',
    task: 3,
    link: 1,
    messages: 10
  }
}, {
  id: '604',
  sectionId: '501',
  status: 'todo',
  priority: 'high',
  title: 'Fix payment failed callback issue in checkout API.',
  assignee: {
    name: 'Noah Parker',
    image: user3
  },
  stats: {
    time: '1 Day',
    task: 5,
    link: 2,
    messages: 14
  }
}, {
  id: '605',
  sectionId: '501',
  status: 'todo',
  priority: 'urgent',
  title: 'Resolve server downtime and restore access logs.',
  assignee: {
    name: 'Lucas Martin',
    image: user7
  },
  stats: {
    time: '8 Hours',
    task: 7,
    link: 3,
    messages: 18
  }
}, {
  id: '606',
  sectionId: '502',
  status: 'in-progress',
  priority: 'high',
  title: 'Implement role-based access control for admin panel.',
  assignee: {
    name: 'Sophia Wilson',
    image: user4
  },
  stats: {
    time: '3 Days',
    task: 5,
    link: 4,
    messages: 11
  }
}, {
  id: '607',
  sectionId: '502',
  status: 'in-progress',
  priority: 'medium',
  title: 'Refactor project directory structure for clarity.',
  assignee: {
    name: 'Hannah Green',
    image: user7
  },
  stats: {
    time: '5 Days',
    task: 3,
    link: 1,
    messages: 7
  }
}, {
  id: '608',
  sectionId: '502',
  status: 'in-progress',
  priority: 'urgent',
  title: 'Resolve 500 errors occurring on user authentication.',
  assignee: {
    name: 'Evelyn Clark',
    image: user9
  },
  stats: {
    time: '6 Hours',
    task: 8,
    link: 5,
    messages: 21
  }
}, {
  id: '609',
  sectionId: '502',
  status: 'in-review',
  priority: 'medium',
  title: 'Add placeholder loading animations (skeleton screens).',
  assignee: {
    name: 'Benjamin Hill',
    image: user10
  },
  stats: {
    time: '4 Days',
    task: 4,
    link: 0,
    messages: 8
  }
}, {
  id: '610',
  sectionId: '503',
  status: 'in-review',
  priority: 'normal',
  title: 'Improve success/error toast notification styles.',
  assignee: {
    name: 'Andrew Carter',
    image: user6
  },
  stats: {
    time: '5 Days',
    task: 1,
    link: 0,
    messages: 3
  }
}, {
  id: '611',
  sectionId: '503',
  status: 'in-review',
  priority: 'high',
  title: 'Integrate analytics dashboard with real-time API data.',
  assignee: {
    name: 'Logan Brooks',
    image: user7
  },
  stats: {
    time: '3 Days',
    task: 6,
    link: 3,
    messages: 12
  }
}, {
  id: '612',
  sectionId: '503',
  status: 'in-review',
  priority: 'medium',
  title: 'Add pagination support to activity feed task.',
  assignee: {
    name: 'Mark Evans',
    image: user1
  },
  stats: {
    time: '4 Days',
    task: 3,
    link: 1,
    messages: 5
  }
}, {
  id: '613',
  sectionId: '504',
  status: 'done',
  priority: 'high',
  title: 'Completed UI redesign for profile settings page.',
  assignee: {
    name: 'Harper Lee',
    image: user3
  },
  stats: {
    time: 'Completed',
    task: 4,
    link: 1,
    messages: 3
  }
}, {
  id: '614',
  sectionId: '504',
  status: 'done',
  priority: 'high',
  title: 'Launched new email notification templating system.',
  assignee: {
    name: 'Jacob Miller',
    image: user5
  },
  stats: {
    time: 'Completed',
    task: 5,
    link: 0,
    messages: 2
  }
}];