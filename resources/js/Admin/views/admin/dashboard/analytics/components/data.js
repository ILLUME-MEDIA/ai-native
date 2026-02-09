import brave from '@admin/assets/images/browsers/brave.svg';
import chrome from '@admin/assets/images/browsers/chrome.svg';
import edge from '@admin/assets/images/browsers/edge.svg';
import firefox from '@admin/assets/images/browsers/firefox.svg';
import globe from '@admin/assets/images/browsers/globe.svg';
import opera from '@admin/assets/images/browsers/opera.svg';
import safari from '@admin/assets/images/browsers/safari.svg';
import tor from '@admin/assets/images/browsers/tor.svg';
import dribbble from '@admin/assets/images/logos/dribbble.svg';
import google from '@admin/assets/images/logos/google.svg';
import instagram from '@admin/assets/images/logos/instagram.svg';
import linkedin from '@admin/assets/images/logos/linkedin.svg';
import messenger from '@admin/assets/images/logos/messenger.svg';
import meta from '@admin/assets/images/logos/meta.svg';
import snapchat from '@admin/assets/images/logos/snapchat.svg';
import telegram from '@admin/assets/images/logos/telegram.svg';
import whatsapp from '@admin/assets/images/logos/whatsapp.svg';
import x from '@admin/assets/images/logos/x.svg';
import flagBR from '@admin/assets/images/flags/br.svg';
import flagCA from '@admin/assets/images/flags/ca.svg';
import flagIN from '@admin/assets/images/flags/in.svg';
import flagUS from '@admin/assets/images/flags/us.svg';
export const visitorData = [{
  title: 'Total Visitors',
  completed: 824300,
  target: 1000000,
  progress: 82
}, {
  title: 'Mobile Traffic',
  completed: 41927,
  target: 60000,
  progress: 69
}, {
  title: 'Desktop Traffic',
  completed: 18476,
  target: 30000,
  progress: 61
}];
export const subscriberData = [{
  title: 'Email Marketing',
  value: 34920,
  progress: 27.41,
  variant: 'secondary'
}, {
  title: 'Social Marketing',
  value: 58775,
  progress: 46.13,
  variant: 'info'
}, {
  title: 'Direct',
  value: 33645,
  progress: 26.46,
  variant: 'success'
}];
export const sessionData = [{
  title: 'Users',
  icon: 'users',
  value: '39.03',
  change: 3.02
}, {
  title: 'Sessions',
  icon: 'eye',
  value: '42.15',
  change: -4.78
}, {
  title: 'Bounce Rate',
  icon: 'trending-up',
  value: '21.2',
  change: -31.39
}, {
  title: 'Session Duration',
  icon: 'clock',
  value: '3m 12s',
  change: 7.92
}];
export const insightData = [{
  pageLink: '/paces/dashboard-analytics',
  views: 25,
  rate: 87.5
}, {
  pageLink: '/paces/dashboard-crm',
  views: 15,
  rate: 21.48
}, {
  pageLink: '/paces/dashboard',
  views: 10,
  rate: 63.59
}];
export const countryData = [{
  name: 'United States',
  flag: flagUS,
  value: 67.5,
  progress: 72.15,
  variant: 'secondary'
}, {
  name: 'India',
  flag: flagIN,
  value: 7.92,
  progress: 28.65,
  variant: 'info'
}, {
  name: 'Brazil',
  flag: flagBR,
  value: 89.05,
  progress: 62.5,
  variant: 'warning'
}, {
  name: 'Canada',
  flag: flagCA,
  value: 5.3,
  progress: 42.2,
  variant: 'success'
}];
export const trafficSourceData = [{
  name: 'Google',
  image: google,
  value: 87.8,
  progress: 72,
  variant: 'warning'
}, {
  name: 'Instagram',
  image: instagram,
  value: 42.9,
  progress: 30,
  variant: 'danger'
}, {
  name: 'LinkedIn',
  image: linkedin,
  value: 58.5,
  progress: 43,
  variant: 'info'
}, {
  name: 'Dribbble',
  image: dribbble,
  value: 2.85,
  progress: 12,
  variant: 'secondary'
}, {
  name: 'Messenger',
  image: messenger,
  value: 9.08,
  progress: 18,
  variant: 'primary'
}, {
  name: 'Meta',
  image: meta,
  value: 77.7,
  progress: 66,
  variant: 'primary'
}, {
  name: 'Telegram',
  image: telegram,
  value: 31.5,
  progress: 46,
  variant: 'success'
}, {
  name: 'Twitter X',
  image: x,
  value: 22.6,
  progress: 29,
  variant: 'dark'
}, {
  name: 'WhatsApp',
  image: whatsapp,
  value: 3.1,
  progress: 18,
  variant: 'danger'
}, {
  name: 'Snapchat',
  image: snapchat,
  value: 5.8,
  progress: 9,
  variant: 'warning'
}];
export const browserData = [{
  name: 'Chrome',
  image: chrome,
  usage: 62.5,
  change: -5.06
}, {
  name: 'Firefox',
  image: firefox,
  usage: 12.3,
  change: -1.5
}, {
  name: 'Safari',
  image: safari,
  usage: 9.86,
  change: 1.03
}, {
  name: 'Brave',
  image: brave,
  usage: 3.15,
  change: -0.3
}, {
  name: 'Opera',
  image: opera,
  usage: 3.01,
  change: 1.58
}, {
  name: 'Tor',
  image: tor,
  usage: 2.8,
  change: 0.01
}, {
  name: 'Edge',
  image: edge,
  usage: 4.25,
  change: 0.75
}, {
  name: 'Other',
  image: globe,
  usage: 6.38,
  change: 3.6
}];
export const analyticData = [{
  pagePath: '/dashboard',
  source: 'Direct',
  views: 3980,
  duration: '02m:12s',
  bounceRate: 19.5,
  conversionRate: 4.3
}, {
  pagePath: '/pricing',
  source: 'Google',
  views: 1742,
  duration: '01m:49s',
  bounceRate: 22.1,
  conversionRate: 6.7
}, {
  pagePath: '/features',
  source: 'LinkedIn',
  views: 2310,
  duration: '02m:05s',
  bounceRate: 17.8,
  conversionRate: 5.4
}, {
  pagePath: '/blog/how-to-boost-sales',
  source: 'Twitter',
  views: 1128,
  duration: '03m:14s',
  bounceRate: 14.9,
  conversionRate: 2.2
}, {
  pagePath: '/docs/get-started',
  source: 'Reddit',
  views: 2540,
  duration: '04m:01s',
  bounceRate: 11.2,
  conversionRate: 7.9
}, {
  pagePath: '/signup',
  source: 'Newsletter',
  views: 3780,
  duration: '02m:29s',
  bounceRate: 28.5,
  conversionRate: 9.1
}, {
  pagePath: '/account/settings',
  source: 'Instagram',
  views: 1690,
  duration: '01m:36s',
  bounceRate: 16.3,
  conversionRate: 3.9
}, {
  pagePath: '/reports/weekly-performance',
  source: 'Direct',
  views: 2245,
  duration: '02m:08s',
  bounceRate: 17.2,
  conversionRate: 4.1
}, {
  pagePath: '/help/faq',
  source: 'Google',
  views: 3015,
  duration: '01m:23s',
  bounceRate: 23.9,
  conversionRate: 2.8
}, {
  pagePath: '/products',
  source: 'Instagram',
  views: 4680,
  duration: '02m:51s',
  bounceRate: 18.4,
  conversionRate: 6.3
}, {
  pagePath: '/downloads',
  source: 'Referral',
  views: 1395,
  duration: '03m:22s',
  bounceRate: 13.6,
  conversionRate: 7.4
}, {
  pagePath: '/contact',
  source: 'Facebook',
  views: 2920,
  duration: '01m:41s',
  bounceRate: 21.7,
  conversionRate: 3.6
}];