import { getColor } from '@admin/utils/helpers';
import mastercard from '@admin/assets/images/cards/mastercard.svg';
import paypal from '@admin/assets/images/cards/paypal.svg';
import stripe from '@admin/assets/images/cards/stripe.svg';
import unionpay from '@admin/assets/images/cards/unionpay.svg';
import visa from '@admin/assets/images/cards/visa.svg';
import user1 from '@admin/assets/images/users/user-1.jpg';
import user2 from '@admin/assets/images/users/user-2.jpg';
import user3 from '@admin/assets/images/users/user-3.jpg';
import user4 from '@admin/assets/images/users/user-4.jpg';
import user5 from '@admin/assets/images/users/user-5.jpg';
import user6 from '@admin/assets/images/users/user-6.jpg';
import user7 from '@admin/assets/images/users/user-7.jpg';
import user8 from '@admin/assets/images/users/user-8.jpg';
import small1 from '@admin/assets/images/stock/small-1.jpg';
import small2 from '@admin/assets/images/stock/small-2.jpg';
import small3 from '@admin/assets/images/stock/small-3.jpg';
import small4 from '@admin/assets/images/stock/small-4.jpg';
import small5 from '@admin/assets/images/stock/small-5.jpg';
export const financeStatData = [{
  icon: 'solar:leaf-bold-duotone',
  value: 51.68,
  title: 'Total Income',
  change: 8.72,
  className: 'text-success',
  chartOptions: () => ({
    chart: {
      type: 'area',
      height: 51,
      sparkline: {
        enabled: true
      }
    },
    series: [{
      data: [25, 28, 32, 38, 43, 55, 60, 48, 42, 51, 35]
    }],
    stroke: {
      width: 2,
      curve: 'smooth'
    },
    markers: {
      size: 0
    },
    colors: [getColor('chart-primary')],
    tooltip: {
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: function (seriesName) {
            return '';
          }
        }
      },
      marker: {
        show: false
      }
    },
    fill: {
      opacity: [1],
      type: ['gradient'],
      gradient: {
        type: 'vertical',
        //   shadeIntensity: 1,
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0,
        stops: [0, 100]
      }
    }
  })
}, {
  icon: 'solar:wallet-money-bold-duotone',
  value: 24.03,
  title: 'Total Expenses',
  change: 3.28,
  className: 'text-info',
  chartOptions: () => ({
    chart: {
      type: 'area',
      height: 51,
      sparkline: {
        enabled: true
      }
    },
    series: [{
      data: [10, 18, 25, 28, 35, 50, 48, 43, 20, 31, 15]
    }],
    stroke: {
      width: 2,
      curve: 'smooth'
    },
    markers: {
      size: 0
    },
    colors: [getColor('chart-primary')],
    tooltip: {
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: function (seriesName) {
            return '';
          }
        }
      },
      marker: {
        show: false
      }
    },
    fill: {
      opacity: [1],
      type: ['gradient'],
      gradient: {
        type: 'vertical',
        //   shadeIntensity: 1,
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0,
        stops: [0, 100]
      }
    }
  })
}, {
  icon: 'solar:chart-2-bold-duotone',
  value: 48.21,
  title: 'Investments',
  change: 5.69,
  className: 'text-warning',
  chartOptions: () => ({
    chart: {
      type: 'area',
      height: 51,
      sparkline: {
        enabled: true
      }
    },
    series: [{
      data: [10, 14, 18, 22, 26, 30, 20, 10, 5, 25, 35]
    }],
    stroke: {
      width: 2,
      curve: 'smooth'
    },
    markers: {
      size: 0
    },
    colors: [getColor('chart-primary')],
    tooltip: {
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: function (seriesName) {
            return '';
          }
        }
      },
      marker: {
        show: false
      }
    },
    fill: {
      opacity: [1],
      type: ['gradient'],
      gradient: {
        type: 'vertical',
        //   shadeIntensity: 1,
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0,
        stops: [0, 100]
      }
    }
  })
}, {
  icon: 'solar:hand-money-bold',
  value: 11.65,
  title: 'Savings',
  change: 10.58,
  className: 'text-secondary',
  chartOptions: () => ({
    chart: {
      type: 'area',
      height: 51,
      sparkline: {
        enabled: true
      }
    },
    series: [{
      data: [45, 38, 36, 22, 32, 36, 45, 55, 50, 42, 25]
    }],
    stroke: {
      width: 2,
      curve: 'smooth'
    },
    markers: {
      size: 0
    },
    colors: [getColor('chart-primary')],
    tooltip: {
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: function (seriesName) {
            return '';
          }
        }
      },
      marker: {
        show: false
      }
    },
    fill: {
      opacity: [1],
      type: ['gradient'],
      gradient: {
        type: 'vertical',
        //   shadeIntensity: 1,
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0,
        stops: [0, 100]
      }
    }
  })
}];
export const overviewData = [{
  title: 'Revenue',
  icon: 'tabler:square-rounded-arrow-down',
  value: 29.56,
  prefix: '$',
  suffix: 'k',
  className: 'text-success'
}, {
  title: 'Expenses',
  icon: 'tabler:square-rounded-arrow-up',
  value: 15.08,
  prefix: '$',
  suffix: 'k',
  className: 'text-danger'
}, {
  title: 'Investment',
  icon: 'tabler:chart-infographic',
  value: 3.67,
  prefix: '$',
  suffix: 'k'
}, {
  title: 'Savings',
  icon: 'tabler:pig',
  value: 6.72,
  prefix: '$',
  suffix: 'k'
}];
export const transactionData = [{
  id: '#TX901',
  user: {
    name: 'Sophia Miller',
    image: user5
  },
  description: 'Subscription Renewal',
  amount: '$299.00',
  date: '22 Nov,25',
  time: '08:24 am',
  type: 'credit',
  Payment: {
    image: visa,
    lastDigit: '*4321'
  },
  status: 'success'
}, {
  id: '#TX900',
  user: {
    name: 'James Carter',
    image: user2
  },
  description: 'Refund Processed',
  amount: '$150.50',
  date: '21 Nov,25',
  time: '07:40 pm',
  type: 'debit',
  Payment: {
    image: mastercard,
    lastDigit: '*9333'
  },
  status: 'pending'
}, {
  id: '#TX899',
  user: {
    name: 'WavePay',
    className: 'bg-secondary-subtle text-secondary'
  },
  description: 'Wallet Top-Up',
  amount: '$620.00',
  date: '21 Nov,25',
  time: '03:12 pm',
  type: 'credit',
  Payment: {
    image: paypal,
    name: 'PayPal'
  },
  status: 'success'
}, {
  id: '#TX898',
  user: {
    name: 'Liam Thompson',
    image: user3
  },
  description: 'Service Charge',
  amount: '$19.99',
  date: '20 Nov,25',
  time: '11:09 am',
  type: 'debit',
  Payment: {
    image: stripe,
    name: 'Stripe'
  },
  status: 'failed'
}, {
  id: '#TX897',
  user: {
    name: 'Emma Stone',
    image: user4
  },
  description: 'Invoice #2112',
  amount: '€420.72',
  date: '18 Nov,25',
  time: '09:51 pm',
  type: 'credit',
  Payment: {
    image: mastercard,
    lastDigit: '*2112'
  },
  status: 'success'
}, {
  id: '#TX896',
  user: {
    name: 'StorePay',
    className: 'bg-warning-subtle text-warning'
  },
  description: 'Point of Sale Payment',
  amount: '£15.00',
  date: '17 Nov,25',
  time: '02:10 pm',
  type: 'debit',
  Payment: {
    image: unionpay,
    lastDigit: '*5510'
  },
  status: 'success'
}, {
  id: '#TX895',
  user: {
    name: 'Olivia Brown',
    image: user8
  },
  description: 'Personal Transfer',
  amount: '$250.00',
  date: '16 Nov,25',
  time: '07:48 am',
  type: 'credit',
  Payment: {
    image: visa,
    lastDigit: '*0244'
  },
  status: 'success'
}, {
  id: '#TX894',
  user: {
    name: 'David Chen',
    image: user1
  },
  description: 'ATM Withdrawal',
  amount: '$180.00',
  date: '15 Nov,25',
  time: '04:33 pm',
  type: 'debit',
  Payment: {
    image: mastercard,
    lastDigit: '*7780'
  },
  status: 'processing'
}, {
  id: '#TX893',
  user: {
    name: 'Marcus Lee',
    image: user6
  },
  description: 'Online Purchase',
  amount: '$65.49',
  date: '14 Nov,24',
  time: '02:09 pm',
  type: 'debit',
  Payment: {
    image: stripe,
    name: 'Stripe'
  },
  status: 'success'
}, {
  id: '#TX892',
  user: {
    name: 'Utility Co.',
    className: 'bg-danger-subtle text-danger'
  },
  description: 'Electricity Bill',
  amount: '£72.10',
  date: '12 Nov,24',
  time: '09:30 am',
  type: 'debit',
  Payment: {
    image: visa,
    lastDigit: '*1188'
  },
  status: 'success'
}, {
  id: '#TX891',
  user: {
    name: 'Henry Walker',
    image: user7
  },
  description: 'Loan EMI Payment',
  amount: '$320.00',
  date: '11 Nov,24',
  time: '04:55 pm',
  type: 'debit',
  Payment: {
    image: mastercard,
    lastDigit: '*9982'
  },
  status: 'success'
}, {
  id: '#TX890',
  user: {
    name: 'Google Services',
    className: 'bg-primary-subtle text-primary'
  },
  description: 'Cloud Subscription',
  amount: '$12.99',
  date: '10 Nov,24',
  time: '08:12 am',
  type: 'debit',
  Payment: {
    image: stripe,
    name: 'Stripe'
  },
  status: 'pending'
}, {
  id: '#TX889',
  user: {
    name: 'Emily Frost',
    image: user3
  },
  description: 'Client Invoice #2455',
  amount: '$980.00',
  date: '09 Nov,24',
  time: '11:21 am',
  type: 'credit',
  Payment: {
    image: paypal,
    name: 'PayPal'
  },
  status: 'success'
}];
export const targetData = [{
  title: 'New Car',
  amount: 25000,
  icon: 'solar:bus-bold-duotone',
  image: small1,
  className: 'bg-primary'
}, {
  title: 'Vacation Trip',
  amount: 7500,
  icon: 'solar:globus-bold-duotone',
  image: small2,
  className: 'bg-secondary'
}, {
  title: 'Education',
  amount: 15200,
  icon: 'solar:square-academic-cap-2-bold-duotone',
  image: small3,
  className: 'bg-warning'
}, {
  title: 'New Home',
  amount: 120000,
  icon: 'solar:home-2-bold-duotone',
  image: small4,
  className: 'bg-danger'
}, {
  title: 'Emergency Fund',
  amount: 10000,
  icon: 'solar:banknote-2-bold-duotone',
  image: small5,
  className: 'bg-info'
}];