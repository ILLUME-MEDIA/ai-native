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
import logoAirbnb from '@admin/assets/images/logos/airbnb.svg';
import logoAmazon from '@admin/assets/images/logos/amazon.svg';
import logoApple from '@admin/assets/images/logos/apple.svg';
import logoAsana from '@admin/assets/images/logos/asana.svg';
import logoDropbox from '@admin/assets/images/logos/dropbox.svg';
import logoFigma from '@admin/assets/images/logos/figma.svg';
import logoMeta from '@admin/assets/images/logos/meta.svg';
import logoMicrosoft from '@admin/assets/images/logos/microsoft.svg';
import logoOpenai from '@admin/assets/images/logos/openai.svg';
import logoShell from '@admin/assets/images/logos/shell.svg';
import logoSlack from '@admin/assets/images/logos/slack.svg';
export const estimationStatData = [{
  value: 52,
  change: 15.7,
  description: 'Total estimations created'
}, {
  value: 24,
  change: 10.2,
  description: 'Approved estimations'
}, {
  value: 8,
  change: -3.9,
  description: 'Declined estimations'
}, {
  value: 138500,
  change: 12.5,
  description: 'Highest estimation value',
  prefix: '$'
}, {
  value: 2.8,
  change: +1.1,
  description: 'Avg. review time',
  suffix: 'days'
}];
export const estimateData = [{
  id: '#EST00042',
  project: 'CRM System Redesign',
  client: {
    name: 'Airbnb',
    image: logoAirbnb
  },
  value: '$25,000',
  estimatedBy: {
    name: 'Jason Miller',
    image: user5
  },
  createdDate: '15 Jul, 2025',
  createdTime: '09:30 AM',
  closeDate: '05 Aug, 2025',
  closeTime: '06:00 PM',
  status: 'in-review'
}, {
  id: '#EST00043',
  project: 'Lead Tracking Module',
  client: {
    name: 'Amazon',
    image: logoAmazon
  },
  value: '$14,200',
  estimatedBy: {
    name: 'Ava Green',
    image: user4
  },
  createdDate: '17 Jul, 2025',
  createdTime: '10:15 AM',
  closeDate: '02 Aug, 2025',
  closeTime: '04:30 PM',
  status: 'approved'
}, {
  id: '#EST00044',
  project: 'Marketing Automation',
  client: {
    name: 'Apple Inc.',
    image: logoApple
  },
  value: '$32,000',
  estimatedBy: {
    name: 'Liam Scott',
    image: user2
  },
  createdDate: '18 Jul, 2025',
  createdTime: '01:40 PM',
  closeDate: '10 Aug, 2025',
  closeTime: '01:00 PM',
  status: 'pending'
}, {
  id: '#EST00045',
  project: 'Sales Pipeline Setup',
  client: {
    name: 'Asana Studio',
    image: logoAsana
  },
  value: '$21,800',
  estimatedBy: {
    name: 'Noah Carter',
    image: user3
  },
  createdDate: '19 Jul, 2025',
  createdTime: '03:00 PM',
  closeDate: '08 Aug, 2025',
  closeTime: '05:45 PM',
  status: 'declined'
}, {
  id: '#EST00046',
  project: 'Support Portal Development',
  client: {
    name: 'Dropbox Inc.',
    image: logoDropbox
  },
  value: '$27,500',
  estimatedBy: {
    name: 'Emily Stone',
    image: user1
  },
  createdDate: '20 Jul, 2025',
  createdTime: '11:20 AM',
  closeDate: '15 Aug, 2025',
  closeTime: '09:00 AM',
  status: 'in-review'
}, {
  id: '#EST00047',
  project: 'Client Onboarding System',
  client: {
    name: 'Figma Design',
    image: logoFigma
  },
  value: '$16,600',
  estimatedBy: {
    name: 'Sophia White',
    image: user6
  },
  createdDate: '21 Jul, 2025',
  createdTime: '02:00 PM',
  closeDate: '06 Aug, 2025',
  closeTime: '12:00 PM',
  status: 'sent'
}, {
  id: '#EST00048',
  project: 'Customer Insights Dashboard',
  client: {
    name: 'Meta',
    image: logoMeta
  },
  value: '$29,900',
  estimatedBy: {
    name: 'Mason Lee',
    image: user7
  },
  createdDate: '22 Jul, 2025',
  createdTime: '11:00 AM',
  closeDate: '10 Aug, 2025',
  closeTime: '04:00 PM',
  status: 'in-review'
}, {
  id: '#EST00049',
  project: 'Workflow Automation Engine',
  client: {
    name: 'Slack',
    image: logoSlack
  },
  value: '$33,750',
  estimatedBy: {
    name: 'Olivia James',
    image: user8
  },
  createdDate: '23 Jul, 2025',
  createdTime: '09:30 AM',
  closeDate: '14 Aug, 2025',
  closeTime: '11:30 AM',
  status: 'approved'
}, {
  id: '#EST00050',
  project: 'Partner API Integration',
  client: {
    name: 'Microsoft',
    image: logoMicrosoft
  },
  value: '$17,600',
  estimatedBy: {
    name: 'Ella Kim',
    image: user9
  },
  createdDate: '24 Jul, 2025',
  createdTime: '10:45 AM',
  closeDate: '12 Aug, 2025',
  closeTime: '03:15 PM',
  status: 'pending'
}, {
  id: '#EST00051',
  project: 'Mobile CRM App Build',
  client: {
    name: 'ChatGPT',
    image: logoOpenai
  },
  value: '$40,000',
  estimatedBy: {
    name: 'Daniel Park',
    image: user10
  },
  createdDate: '25 Jul, 2025',
  createdTime: '02:30 PM',
  closeDate: '20 Aug, 2025',
  closeTime: '05:00 PM',
  status: 'sent'
}, {
  id: '#EST00052',
  project: 'Smart Contact Syncing',
  client: {
    name: 'Shell Petro.',
    image: logoShell
  },
  value: '$13,250',
  estimatedBy: {
    name: 'Chloe Nguyen',
    image: user4
  },
  createdDate: '26 Jul, 2025',
  createdTime: '01:10 PM',
  closeDate: '16 Aug, 2025',
  closeTime: '11:00 AM',
  status: 'declined'
}];