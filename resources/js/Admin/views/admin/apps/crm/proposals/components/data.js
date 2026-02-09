import logoAirbnb from '@admin/assets/images/logos/airbnb.svg';
import logoApple from '@admin/assets/images/logos/apple.svg';
import logoAsana from '@admin/assets/images/logos/asana.svg';
import logoDropbox from '@admin/assets/images/logos/dropbox.svg';
import logoFigma from '@admin/assets/images/logos/figma.svg';
import logoGoogle from '@admin/assets/images/logos/google.svg';
import logoHandm from '@admin/assets/images/logos/h&m.svg';
import logoMeta from '@admin/assets/images/logos/meta.svg';
import logoMicrosoft from '@admin/assets/images/logos/microsoft.svg';
import logoOpenai from '@admin/assets/images/logos/openai.svg';
import logoShell from '@admin/assets/images/logos/shell.svg';
export const proposalStatData = [{
  value: 38,
  change: 12.4,
  description: 'Total proposals submitted'
}, {
  value: 19,
  change: 9.8,
  description: 'Approved proposals'
}, {
  value: 7,
  change: -4.2,
  description: 'Declined proposals'
}, {
  value: 112000,
  change: 12.5,
  description: 'Highest proposal value',
  prefix: '$'
}, {
  value: 2.5,
  change: 0.8,
  description: 'Avg. review time',
  suffix: 'days'
}];
export const proposalData = [{
  id: '#PS008101',
  subject: 'SEO Optimization Campaign',
  sendTo: {
    name: 'Google Inc.',
    image: logoGoogle
  },
  value: '$18,900',
  createdDate: '12 Jul, 2025',
  createdTime: '10:00 AM',
  openTillDate: '30 Jul, 2025',
  openTillTime: '11:59 PM',
  status: 'pending'
}, {
  id: '#PS008102',
  subject: 'New Mobile App Development',
  sendTo: {
    name: 'Apple Inc.',
    image: logoApple
  },
  value: '$35,000',
  createdDate: '18 Jul, 2025',
  createdTime: '3:15 PM',
  openTillDate: '15 Aug, 2025',
  openTillTime: '12:00 PM',
  status: 'approved'
}, {
  id: '#PS008103',
  subject: 'Marketing Retargeting Plan',
  sendTo: {
    name: 'Meta Platforms',
    image: logoMeta,
    logoHeight: 12
  },
  value: '$22,750',
  createdDate: '22 Jul, 2025',
  createdTime: '9:30 AM',
  openTillDate: '10 Aug, 2025',
  openTillTime: '5:00 PM',
  status: 'declined'
}, {
  id: '#PS008104',
  subject: 'UI/UX Redesign for SaaS App',
  sendTo: {
    name: 'Figma Inc.',
    image: logoFigma
  },
  value: '$9,800',
  createdDate: '24 Jul, 2025',
  createdTime: '11:20 AM',
  openTillDate: '07 Aug, 2025',
  openTillTime: '6:00 PM',
  status: 'in-review'
}, {
  id: '#PS008105',
  subject: 'Cloud Infrastructure Setup',
  sendTo: {
    name: 'AirBNB',
    image: logoAirbnb
  },
  value: '$45,000',
  createdDate: '26 Jul, 2025',
  createdTime: '9:10 AM',
  openTillDate: '09 Aug, 2025',
  openTillTime: '5:00 PM',
  status: 'approved'
}, {
  id: '#PS008106',
  subject: 'Digital Marketing Strategy',
  sendTo: {
    name: 'Asana',
    image: logoAsana,
    logoHeight: 16
  },
  value: '$27,600',
  createdDate: '25 Jul, 2025',
  createdTime: '2:30 PM',
  openTillDate: '08 Aug, 2025',
  openTillTime: '3:00 PM',
  status: 'pending'
}, {
  id: '#PS008107',
  subject: 'Backend API Integration',
  sendTo: {
    name: 'Microsoft Enterprise',
    image: logoMicrosoft,
    logoHeight: 14
  },
  value: '$14,200',
  createdDate: '23 Jul, 2025',
  createdTime: '1:00 PM',
  openTillDate: '01 Aug, 2025',
  openTillTime: '2:00 PM',
  status: 'sent'
}, {
  id: '#PS008108',
  subject: 'Performance Audit Report',
  sendTo: {
    name: 'Dropbox',
    image: logoDropbox
  },
  value: '$6,500',
  createdDate: '20 Jul, 2025',
  createdTime: '4:45 PM',
  openTillDate: '28 Jul, 2025',
  openTillTime: '11:00 AM',
  status: 'declined'
}, {
  id: '#PS008109',
  subject: 'Data Migration Strategy',
  sendTo: {
    name: 'Dropbox Inc.',
    image: logoDropbox
  },
  value: '$19,400',
  createdDate: '19 Jul, 2025',
  createdTime: '3:20 PM',
  openTillDate: '03 Aug, 2025',
  openTillTime: '10:00 AM',
  status: 'pending'
}, {
  id: '#PS008110',
  subject: 'Customer Portal UI Design',
  sendTo: {
    name: 'ChatGPT',
    image: logoOpenai
  },
  value: '$31,000',
  createdDate: '18 Jul, 2025',
  createdTime: '12:15 PM',
  openTillDate: '02 Aug, 2025',
  openTillTime: '6:00 PM',
  status: 'approved'
}, {
  id: '#PS008111',
  subject: 'Mobile Analytics Dashboard',
  sendTo: {
    name: 'Mixpanel',
    image: logoHandm,
    logoHeight: 14
  },
  value: '$15,900',
  createdDate: '16 Jul, 2025',
  createdTime: '4:00 PM',
  openTillDate: '30 Jul, 2025',
  openTillTime: '5:00 PM',
  status: 'sent'
}, {
  id: '#PS008112',
  subject: 'AI-Powered Lead Generator',
  sendTo: {
    name: 'OpenAI',
    image: logoOpenai
  },
  value: '$52,300',
  createdDate: '21 Jul, 2025',
  createdTime: '1:45 PM',
  openTillDate: '04 Aug, 2025',
  openTillTime: '11:00 AM',
  status: 'in-review'
}, {
  id: '#PS008113',
  subject: 'Enterprise Security Audit',
  sendTo: {
    name: 'Cloudflare',
    image: logoShell
  },
  value: '$40,750',
  createdDate: '22 Jul, 2025',
  createdTime: '9:15 AM',
  openTillDate: '06 Aug, 2025',
  openTillTime: '4:00 PM',
  status: 'declined'
}];