import airbnbLogo from '@admin/assets/images/logos/airbnb.svg';
import appleLogo from '@admin/assets/images/logos/apple.svg';
import asanaLogo from '@admin/assets/images/logos/asana.svg';
import dropboxLogo from '@admin/assets/images/logos/dropbox.svg';
import figmaLogo from '@admin/assets/images/logos/figma.svg';
import googleLogo from '@admin/assets/images/logos/google.svg';
import openaiLogo from '@admin/assets/images/logos/openai.svg';
import shellLogo from '@admin/assets/images/logos/shell.svg';
import slackLogo from '@admin/assets/images/logos/slack.svg';
import starbucksLogo from '@admin/assets/images/logos/starbucks.svg';
export const dealData = [{
  name: 'Enterprise Software',
  company: 'Google Inc',
  image: googleLogo,
  amount: '$102000',
  stage: 'Proposal Sent',
  probability: 65,
  date: '15 Aug, 2025'
}, {
  name: 'Marketing Automation',
  company: 'Airbnb',
  image: airbnbLogo,
  amount: '$85000',
  stage: 'Qualified',
  probability: 55,
  date: '10 Aug, 2025'
}, {
  name: 'Cloud Storage Deal',
  company: 'Dropbox',
  image: dropboxLogo,
  amount: '$47000',
  stage: 'Negotiation',
  probability: 80,
  date: '18 Aug, 2025'
}, {
  name: 'AI Chatbot Integration',
  company: 'OpenAI',
  image: openaiLogo,
  amount: '$59500',
  stage: 'Proposal Sent',
  probability: 65,
  date: '22 Aug, 2025'
}, {
  name: 'eCommerce Platform',
  company: 'Apple',
  image: appleLogo,
  amount: '$71200',
  stage: 'Qualification',
  probability: 45,
  date: '25 Aug, 2025'
}, {
  name: 'Sales CRM Deal',
  company: 'Shell',
  image: shellLogo,
  amount: '$95000',
  stage: 'Won',
  probability: 100,
  date: '30 Aug, 2025'
}, {
  name: 'Video Conferencing License',
  company: 'Figma Inc',
  image: figmaLogo,
  amount: '$38000',
  stage: 'Lost',
  probability: 0,
  date: '12 Sep, 2025'
}, {
  name: 'Customer Support Suite',
  company: 'Starbucks',
  image: starbucksLogo,
  amount: '$52000',
  stage: 'Proposal Sent',
  probability: 70,
  date: '03 Sep, 2025'
}, {
  name: 'Project Management SaaS',
  company: 'Slack',
  image: slackLogo,
  amount: '$44000',
  stage: 'Negotiation',
  probability: 60,
  date: '06 Sep, 2025'
}, {
  name: 'Data Visualization Tool',
  company: 'Asana',
  image: asanaLogo,
  amount: '$67300',
  stage: 'Qualified',
  probability: 50,
  date: '10 Sep, 2025'
}, {
  name: 'Team Chat Platform',
  company: 'Slack',
  image: slackLogo,
  amount: '$62000',
  stage: 'Won',
  probability: 100,
  date: '15 Sep, 2025'
}];
export const dealStatData = [{
  value: 1230,
  change: 9.85,
  title: 'Total deals created',
  progress: 9.85,
  className: 'primary'
}, {
  value: 860,
  change: 5.2,
  title: 'Deals won',
  progress: 5.2,
  className: 'success'
}, {
  value: 270,
  change: 2.45,
  title: 'Deals lost',
  progress: 2.45,
  className: 'danger'
}, {
  value: 220000,
  change: 17.1,
  title: 'Highest deal closed',
  progress: 100,
  className: 'warning',
  prefix: '$'
}, {
  value: 15,
  change: 1.1,
  title: 'Avg. close time',
  progress: 5.1,
  className: 'secondary',
  suffix: 'days'
}];