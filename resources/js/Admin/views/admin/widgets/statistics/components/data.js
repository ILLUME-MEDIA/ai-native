export const summaryData = [{
  title: 'Total Projects',
  value: 6847,
  icon: 'briefcase',
  className: 'bg-secondary-subtle text-secondary',
  change: -9.19
}, {
  title: 'Total Tasks',
  value: 9.6,
  suffix: 'k',
  icon: 'receipt',
  className: 'bg-primary-subtle text-primary',
  change: 26.87
}, {
  title: 'Avg. Project Earnings',
  value: 98.24,
  prefix: '$',
  suffix: 'k',
  icon: 'wallet',
  className: 'bg-warning-subtle text-warning',
  change: 3.51
}, {
  title: 'Productivity',
  value: 87.84,
  suffix: '%',
  icon: 'trending-up',
  className: 'bg-success-subtle text-success',
  change: -1.05
}, {
  title: 'Project Completion',
  value: 72.4,
  suffix: '%',
  icon: 'check-circle',
  className: 'bg-info-subtle text-info',
  change: 3.47
}];
export const progressData = [{
  title: 'Active Projects',
  value: 28,
  progress: {
    label: 'PROGRESS',
    value: 75
  },
  icon: 'tabler:clipboard-list',
  variant: 'info'
}, {
  title: 'Tasks Completed',
  value: 124,
  progress: {
    label: 'TARGET',
    value: 88
  },
  icon: 'tabler:checklist',
  variant: 'success'
}, {
  title: 'Pending Tasks',
  value: 16,
  progress: {
    label: 'DEADLINES',
    value: 42
  },
  icon: 'tabler:clock-hour-4',
  variant: 'warning'
}, {
  title: 'Project Managers',
  value: 9,
  progress: {
    label: 'ALLOCATED',
    value: 100
  },
  icon: 'tabler:user-cog',
  variant: 'danger'
}];
export const metricData = [{
  title: 'New Subscriptions',
  value: 438,
  icon: 'tabler:bell-plus',
  className: 'border border-3 border-secondary bg-secondary bg-opacity-75 text-white'
}, {
  title: 'Support Tickets',
  value: 108,
  icon: 'tabler:headset',
  className: 'bg-danger-subtle text-danger'
}, {
  title: 'Conversion Rate',
  value: 3.7,
  suffix: '%',
  icon: 'tabler:chart-pie',
  className: 'text-bg-light'
}, {
  title: 'Revenue Growth',
  value: 12.4,
  prefix: '+',
  suffix: '%',
  icon: 'tabler:trending-up',
  className: 'text-bg-dark'
}];
export const dealStatData = [{
  value: 1230,
  title: 'Total deals created',
  icon: 'contract',
  change: 9.85,
  progress: 9.85,
  variant: 'primary'
}, {
  value: 860,
  title: 'Deals won',
  icon: 'medal',
  change: 5.2,
  progress: 5.2,
  variant: 'success'
}, {
  value: 270,
  title: 'Deals lost',
  icon: 'x',
  change: -2.45,
  progress: 2.45,
  variant: 'danger'
}, {
  value: 220000,
  prefix: '$',
  title: 'Highest deal closed',
  icon: 'currency-dollar',
  change: 17.1,
  progress: 100,
  variant: 'warning'
}, {
  value: 15,
  suffix: 'days',
  title: 'Avg. close time',
  icon: 'clock',
  change: 1.1,
  progress: 5.1,
  variant: 'secondary'
}];
export const statData = [{
  title: 'Model Requests',
  icon: 'cpu',
  value: 78.4,
  suffix: 'k',
  change: 6.8,
  changeText: '5.0k Up',
  target: {
    label: 'Monthly Target',
    value: '100k'
  },
  badge: {
    label: 'On Track',
    className: 'bg-success-subtle text-success',
    icon: 'circle-check'
  }
}, {
  title: 'Successful Inferences',
  icon: 'circle-check',
  value: 95.3,
  suffix: '%',
  change: -1.2,
  changeText: 'Tiny Drop',
  target: {
    label: 'SLA Target',
    value: '98%'
  },
  badge: {
    label: 'Monitor',
    className: 'bg-warning-subtle text-warning',
    icon: 'alert-circle'
  }
}, {
  title: 'Response Time',
  icon: 'clock',
  value: 185,
  suffix: 'ms',
  change: 3.4,
  changeText: 'Faster',
  target: {
    label: 'Latency Target',
    value: '200ms'
  },
  badge: {
    label: 'Great',
    className: 'bg-success-subtle text-success',
    icon: 'thumb-up'
  }
}, {
  title: 'AI Revenue Impact',
  icon: 'chart-bar',
  value: 2.84,
  prefix: '$',
  suffix: 'M',
  change: 8.9,
  changeText: '$230k Up',
  target: {
    label: 'Quarter Goal',
    value: '$3.5M'
  },
  badge: {
    label: 'Ahead',
    className: 'bg-success-subtle text-success',
    icon: 'circle-check'
  }
}];
export const miniStatData = [{
  icon: 'solar:cpu-bolt-bold-duotone',
  className: 'text-primary',
  value: 12.5,
  suffix: 'M',
  title: 'Tokens Processed',
  change: 6.4
}, {
  icon: 'solar:cloud-plus-bold-duotone',
  className: 'text-info',
  value: 284,
  suffix: 'k',
  title: 'API Requests',
  change: 4.8
}, {
  icon: 'solar:target-bold-duotone',
  className: 'text-warning',
  value: 98.6,
  suffix: '%',
  title: 'Model Accuracy',
  change: 1.2
}, {
  icon: 'solar:clock-circle-bold-duotone',
  className: 'text-secondary',
  value: 210,
  suffix: 'ms',
  title: 'Response Time',
  change: -3.1
}, {
  icon: 'solar:hand-money-bold-duotone',
  className: 'text-success',
  value: 76.4,
  prefix: '$',
  suffix: 'k',
  title: 'Cost Savings',
  change: 9.5
}, {
  icon: 'solar:server-square-cloud-bold-duotone',
  className: 'text-danger',
  value: 62.3,
  suffix: '%',
  title: 'GPU Utilization',
  change: 2.7
}];
export const businessStatData = [{
  title: 'Active Subscribers',
  badge: {
    label: 'Monthly',
    className: 'badge-soft-success'
  },
  icon: 'tabler:user-check',
  className: 'text-bg-dark',
  value: 12850,
  description: 'Current Active Users'
}, {
  title: 'MRR (Revenue)',
  badge: {
    label: 'Monthly',
    className: 'badge-soft-primary'
  },
  icon: 'tabler:currency-dollar',
  className: 'text-bg-primary',
  prefix: '$',
  value: 245.6,
  suffix: 'K',
  description: 'Monthly Recurring Revenue'
}, {
  title: 'Churn Rate',
  badge: {
    label: 'Monthly',
    className: 'badge-soft-danger'
  },
  icon: 'tabler:arrow-back-up',
  className: 'text-bg-danger',
  value: 3.25,
  suffix: '%',
  description: 'Lost Subscribers Rate'
}, {
  title: 'New Signups',
  badge: {
    label: 'Monthly',
    className: 'badge-soft-warning'
  },
  icon: 'tabler:user-plus',
  className: 'text-bg-warning',
  value: 1942,
  description: 'New Subscribers Added'
}];