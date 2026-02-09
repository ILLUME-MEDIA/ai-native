import { toPascalCase } from '@admin/utils/helpers';
export const columns = [{
  title: 'Company',
  data: 'company'
}, {
  title: 'Symbol',
  data: 'symbol'
}, {
  title: 'Price',
  data: 'price',
  render: data => `${data}`,
  className: 'text-start'
}, {
  title: 'Change',
  data: 'change',
  render: data => `${data}%`,
  className: 'text-start'
}, {
  title: 'Volume',
  data: 'volume',
  className: 'text-start'
}, {
  title: 'Market Cap',
  data: 'marketCap',
  render: data => `${data}`
}, {
  title: 'Rating',
  data: 'rating',
  render: data => `${data} ★`
}, {
  title: 'Status',
  data: 'status',
  render: data => {
    const badgeClass = data.toLowerCase() === 'bullish' ? 'success' : 'danger';
    return `<span class="badge badge-soft-${badgeClass}">${toPascalCase(data)}</span>`;
  }
}, {
  title: 'Sector',
  data: 'sector'
}, {
  title: 'Industry',
  data: 'industry'
}, {
  title: 'Employees',
  data: 'employees'
}, {
  title: 'Founded',
  data: 'founded'
}, {
  title: 'P/E Ratio',
  data: 'peRatio'
}, {
  title: 'Dividend',
  data: 'dividend'
}, {
  title: '52W High',
  data: 'high52W'
}, {
  title: '52W Low',
  data: 'low52W'
}, {
  title: 'CEO',
  data: 'ceo'
}];
export const companies = [{
  company: 'Apple Inc.',
  symbol: 'AAPL',
  price: '$2109.53',
  change: '-0.42%',
  volume: '48,374,838',
  marketCap: '$53.59B',
  rating: '4.7 ★',
  status: 'Bearish',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  employees: '160,000',
  founded: '1976',
  peRatio: '28.5',
  dividend: '0.65%',
  high52W: '$2150',
  low52W: '$1200',
  ceo: 'Tim Cook'
}, {
  company: 'Microsoft Corp.',
  symbol: 'MSFT',
  price: '$450.98',
  change: '-2.04%',
  volume: '26,604,335',
  marketCap: '$927.77B',
  rating: '3.8 ★',
  status: 'Bearish',
  sector: 'Technology',
  industry: 'Software',
  employees: '221,000',
  founded: '1975',
  peRatio: '35.1',
  dividend: '0.82%',
  high52W: '$480',
  low52W: '$320',
  ceo: 'Satya Nadella'
}, {
  company: 'Amazon.com Inc.',
  symbol: 'AMZN',
  price: '$127.54',
  change: '+1.12%',
  volume: '36,992,200',
  marketCap: '$1.24T',
  rating: '4.5 ★',
  status: 'Bullish',
  sector: 'Consumer Discretionary',
  industry: 'E-Commerce',
  employees: '1,540,000',
  founded: '1994',
  peRatio: '61.4',
  dividend: '0%',
  high52W: '$145',
  low52W: '$87',
  ceo: 'Andy Jassy'
}, {
  company: 'Alphabet Inc.',
  symbol: 'GOOGL',
  price: '$138.34',
  change: '+0.77%',
  volume: '25,105,431',
  marketCap: '$1.74T',
  rating: '4.6 ★',
  status: 'Bullish',
  sector: 'Communication Services',
  industry: 'Internet Content',
  employees: '190,711',
  founded: '1998',
  peRatio: '29.8',
  dividend: '0%',
  high52W: '$145',
  low52W: '$95',
  ceo: 'Sundar Pichai'
}, {
  company: 'Meta Platforms Inc.',
  symbol: 'META',
  price: '$332.25',
  change: '-0.12%',
  volume: '14,837,201',
  marketCap: '$948.33B',
  rating: '4.1 ★',
  status: 'Bearish',
  sector: 'Communication Services',
  industry: 'Social Media',
  employees: '71,970',
  founded: '2004',
  peRatio: '24.2',
  dividend: '0%',
  high52W: '$360',
  low52W: '$255',
  ceo: 'Mark Zuckerberg'
}];