import amex from '@admin/assets/images/cards/american-express.svg';
import mastercard from '@admin/assets/images/cards/mastercard.svg';
import paypal from '@admin/assets/images/cards/paypal.svg';
import visa from '@admin/assets/images/cards/visa.svg';
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
export const expenseStatData = [{
  icon: 'wallet',
  className: 'bg-primary-subtle text-primary',
  title: 'Total Expenses',
  value: 15240,
  prefix: '$'
}, {
  icon: 'circle-check',
  className: 'bg-success-subtle text-success',
  title: 'Approved Expenses',
  value: 10780,
  prefix: '$'
}, {
  icon: 'hourglass',
  className: 'bg-warning-subtle text-warning',
  title: 'Pending Approval',
  value: 2940,
  prefix: '$'
}, {
  icon: 'refresh',
  className: 'bg-info-subtle text-info',
  title: 'Reimbursed',
  value: 1520,
  prefix: '$'
}];
export const expenseData = [{
  id: '#EXP-1023',
  title: 'Office Stationery',
  category: 'Office Supplies',
  paymentMethod: {
    image: mastercard,
    type: 'card',
    number: '**** 4421'
  },
  amount: '$248.50',
  status: 'approved',
  date: '02 Oct, 2025',
  time: '09:45 AM',
  addedBy: {
    image: user5,
    name: 'John Miller'
  }
}, {
  id: '#EXP-1024',
  title: 'Flight to New York',
  category: 'Travel',
  paymentMethod: {
    image: visa,
    type: 'card',
    number: '**** 6783'
  },
  amount: '$820',
  status: 'pending',
  date: '04 Oct, 2025',
  time: '02:10 PM',
  addedBy: {
    image: user7,
    name: 'Sarah Lee'
  }
}, {
  id: '#EXP-1025',
  title: 'Team Dinner',
  category: 'Meals',
  paymentMethod: {
    image: paypal,
    type: 'other',
    number: 'PayPal'
  },
  amount: '$185.75',
  status: 'approved',
  date: '03 Oct, 2025',
  time: '08:00 PM',
  addedBy: {
    image: user6,
    name: 'David Wilson'
  }
}, {
  id: '#EXP-1026',
  title: 'Printer Repair & Service',
  category: 'Maintenance',
  paymentMethod: {
    image: amex,
    type: 'card',
    number: '**** 9124'
  },
  amount: '$96.20',
  status: 'rejected',
  date: '01 Oct, 2025',
  time: '03:40 PM',
  addedBy: {
    image: user9,
    name: 'Olivia Brown'
  }
}, {
  id: '#EXP-1027',
  title: 'Software Subscription',
  category: 'Utilities',
  paymentMethod: {
    image: mastercard,
    type: 'card',
    number: '**** 2217'
  },
  amount: '$59.99',
  status: 'reimbursed',
  date: '30 Sep, 2025',
  time: '11:20 AM',
  addedBy: {
    image: user10,
    name: 'Ethan Brooks'
  }
}, {
  id: '#EXP-1028',
  title: 'Office Coffee Machine',
  category: 'Equipment',
  paymentMethod: {
    image: visa,
    type: 'card',
    number: '**** 3328'
  },
  amount: '$342.60',
  status: 'pending',
  date: '28 Sep, 2025',
  time: '09:05 AM',
  addedBy: {
    image: user1,
    name: 'Liam Davis'
  }
}, {
  id: '#EXP-1029',
  title: 'Office Internet Bill',
  category: 'Utilities',
  paymentMethod: {
    image: visa,
    type: 'card',
    number: '**** 5454'
  },
  amount: '$129',
  status: 'approved',
  date: '27 Sep, 2025',
  time: '01:25 PM',
  addedBy: {
    image: user3,
    name: 'Emily Clark'
  }
}, {
  id: '#EXP-1030',
  title: 'Client Entertainment',
  category: 'Entertainment',
  paymentMethod: {
    image: mastercard,
    type: 'card',
    number: '**** 9128'
  },
  amount: '$298.40',
  status: 'pending',
  date: '25 Sep, 2025',
  time: '07:55 PM',
  addedBy: {
    image: user2,
    name: 'Daniel Ray'
  }
}, {
  id: '#EXP-1031',
  title: 'Conference Registration',
  category: 'Training & Events',
  paymentMethod: {
    image: amex,
    type: 'card',
    number: '**** 7742'
  },
  amount: '$560',
  status: 'approved',
  date: '24 Sep, 2025',
  time: '09:20 AM',
  addedBy: {
    image: user4,
    name: 'Emma Johnson'
  }
}, {
  id: '#EXP-1032',
  title: 'Office Furniture Purchase',
  category: 'Equipment',
  paymentMethod: {
    image: visa,
    type: 'card',
    number: '**** 2398'
  },
  amount: '$1125',
  status: 'reimbursed',
  date: '22 Sep, 2025',
  time: '04:50 PM',
  addedBy: {
    image: user8,
    name: 'Lucas Martin'
  }
}, {
  id: '#EXP-1033',
  title: 'Taxi Fare - Client Visit',
  category: 'Travel',
  paymentMethod: {
    image: paypal,
    type: 'other',
    name: 'PayPal'
  },
  amount: '$42.50',
  status: 'rejected',
  date: '20 Sep, 2025',
  time: '05:35 PM',
  addedBy: {
    image: user7,
    name: 'Sophia Turner'
  }
}];