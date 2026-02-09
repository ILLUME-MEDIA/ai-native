import amex from '@admin/assets/images/cards/american-express.svg';
import mastercard from '@admin/assets/images/cards/mastercard.svg';
import paypal from '@admin/assets/images/cards/paypal.svg';
import visa from '@admin/assets/images/cards/visa.svg';
import user1 from '@admin/assets/images/users/user-1.jpg';
import user2 from '@admin/assets/images/users/user-2.jpg';
import user3 from '@admin/assets/images/users/user-3.jpg';
import user4 from '@admin/assets/images/users/user-4.jpg';
import user5 from '@admin/assets/images/users/user-5.jpg';
import user6 from '@admin/assets/images/users/user-6.jpg';
import user7 from '@admin/assets/images/users/user-7.jpg';
import user8 from '@admin/assets/images/users/user-8.jpg';
import user9 from '@admin/assets/images/users/user-9.jpg';
export const transactionStatData = [{
  icon: 'currency-dollar',
  className: 'bg-primary-subtle text-primary',
  value: 56240,
  title: 'Total Income',
  prefix: '$'
}, {
  icon: 'wallet',
  className: 'bg-success-subtle text-success',
  value: 48920,
  title: 'Received Income',
  prefix: '$'
}, {
  icon: 'hourglass',
  className: 'bg-warning-subtle text-warning',
  value: 6520,
  title: 'Pending Payments',
  prefix: '$'
}, {
  icon: 'credit-card-refund',
  className: 'bg-danger-subtle text-danger',
  value: 1790,
  title: 'Refunded Income',
  prefix: '$'
}];
export const transactionData = [{
  id: '#TRX-2001',
  description: 'Product Sale - Online Store',
  type: 'credit',
  paymentMethod: {
    image: mastercard,
    type: 'card',
    number: '**** 5623'
  },
  amount: '+$450.00',
  balance: '$5240',
  status: 'completed',
  date: '10 Oct, 2025',
  time: '01:20 PM',
  processedBy: {
    image: user4,
    name: 'Emma Johnson'
  }
}, {
  id: '#TRX-2002',
  description: 'Office Supplies Purchase',
  type: 'debit',
  paymentMethod: {
    image: visa,
    type: 'card',
    number: '**** 9381'
  },
  amount: '−$120.00',
  balance: '$5120',
  status: 'pending',
  date: '09 Oct, 2025',
  time: '04:10 PM',
  processedBy: {
    image: user6,
    name: 'David Wilson'
  }
}, {
  id: '#TRX-2003',
  description: 'Refund – Order #7845 (Return)',
  type: 'refund',
  paymentMethod: {
    image: paypal,
    type: 'other',
    number: 'PayPal'
  },
  amount: '+$89.99',
  balance: '$5209.99',
  status: 'completed',
  date: '08 Oct, 2025',
  time: '02:45 PM',
  processedBy: {
    image: user7,
    name: 'Sophia Lee'
  }
}, {
  id: '#TRX-2004',
  description: 'Balance Adjustment (Manual)',
  type: 'adjustment',
  paymentMethod: {
    image: amex,
    type: 'card',
    number: '**** 3478'
  },
  amount: '+$150.00',
  balance: '$5359.99',
  status: 'adjustment',
  date: '07 Oct, 2025',
  time: '11:10 AM',
  processedBy: {
    image: user2,
    name: 'Daniel Ray'
  }
}, {
  id: '#TRX-2005',
  description: 'Subscription Renewal Attempt',
  type: 'debit',
  paymentMethod: {
    image: mastercard,
    type: 'card',
    number: '**** 4412'
  },
  amount: '−$49.99',
  balance: '$5310',
  status: 'failed',
  date: '06 Oct, 2025',
  time: '08:35 AM',
  processedBy: {
    image: user9,
    name: 'Liam Brown'
  }
}, {
  id: '#TRX-2006',
  description: 'Client Payment – Project Alpha',
  type: 'credit',
  paymentMethod: {
    image: visa,
    type: 'card',
    number: '**** 8890'
  },
  amount: '+$2,000.00',
  balance: '$7310',
  status: 'completed',
  date: '05 Oct, 2025',
  time: '05:00 PM',
  processedBy: {
    image: user5,
    name: 'John Miller'
  }
}, {
  id: '#TRX-2007',
  description: 'Software Subscription Payment',
  type: 'debit',
  paymentMethod: {
    image: visa,
    type: 'card',
    number: '**** 2311'
  },
  amount: '−$120.00',
  balance: '$7190',
  status: 'pending',
  date: '04 Oct, 2025',
  time: '09:15 AM',
  processedBy: {
    image: user1,
    name: 'Olivia Green'
  }
}, {
  id: '#TRX-2008',
  description: 'Freelance Payment – UI Design Project',
  type: 'credit',
  paymentMethod: {
    image: mastercard,
    type: 'card',
    number: '**** 7654'
  },
  amount: '+$1,500.00',
  balance: '$8690',
  status: 'completed',
  date: '03 Oct, 2025',
  time: '04:25 PM',
  processedBy: {
    image: user8,
    name: 'Mason Carter'
  }
}, {
  id: '#TRX-2009',
  description: 'Monthly Internet Bill',
  type: 'debit',
  paymentMethod: {
    image: visa,
    type: 'card',
    number: '**** 5582'
  },
  amount: '−$80.00',
  balance: '$8610',
  status: 'pending',
  date: '02 Oct, 2025',
  time: '01:10 PM',
  processedBy: {
    image: user3,
    name: 'Emily Clark'
  }
}, {
  id: '#TRX-2010',
  description: 'Refund – Cancelled Workshop Ticket',
  type: 'refund',
  paymentMethod: {
    image: paypal,
    type: 'other',
    number: 'PayPal'
  },
  amount: '+$120.00',
  balance: '$8730',
  status: 'completed',
  date: '01 Oct, 2025',
  time: '03:35 PM',
  processedBy: {
    image: user9,
    name: 'Liam Brown'
  }
}, {
  id: '#TRX-2011',
  description: 'Bank Service Fee Reversal',
  type: 'adjustment',
  paymentMethod: {
    image: amex,
    type: 'card',
    number: '**** 9012'
  },
  amount: '+$30.00',
  balance: '$8760',
  status: 'adjustment',
  date: '30 Sep, 2025',
  time: '10:25 AM',
  processedBy: {
    image: user7,
    name: 'Sophia Lee'
  }
}, {
  id: '#TRX-2012',
  description: 'Travel Expense – Client Meeting',
  type: 'debit',
  paymentMethod: {
    image: mastercard,
    type: 'card',
    number: '**** 5534'
  },
  amount: '−$260.00',
  balance: '$8500',
  status: 'completed',
  date: '29 Sep, 2025',
  time: '06:40 PM',
  processedBy: {
    image: user1,
    name: 'Olivia Green'
  }
}];