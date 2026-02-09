export const emailSidebarMenu = [{
  label: 'Inbox',
  icon: 'inbox',
  link: '/apps/email/inbox',
  badge: {
    className: 'bg-danger-subtle text-danger',
    text: '21'
  }
}, {
  label: 'Sent',
  icon: 'send-2',
  link: ''
}, {
  label: 'Starred',
  icon: 'star',
  link: ''
}, {
  label: 'Scheduled',
  icon: 'clock',
  link: ''
}, {
  label: 'Drafts',
  icon: 'pencil',
  link: '',
  badge: {
    className: 'bg-secondary-subtle text-secondary',
    text: '9'
  }
}, {
  label: 'Important',
  icon: 'alert-circle',
  link: ''
}, {
  label: 'Spam',
  icon: 'ban',
  link: ''
}, {
  label: 'Trash',
  icon: 'trash',
  link: ''
}];
export const labels = [{
  name: 'Business',
  iconClassName: 'primary'
}, {
  name: 'Personal',
  iconClassName: 'purple'
}, {
  name: 'Friends',
  iconClassName: 'info'
}, {
  name: 'Family',
  iconClassName: 'warning'
}];