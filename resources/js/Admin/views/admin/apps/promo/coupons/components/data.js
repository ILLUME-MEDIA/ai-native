export const couponStatData = [{
  title: 'Total Coupons',
  value: '1,245',
  change: 4.26,
  icon: 'ticket',
  iconClassName: 'text-bg-primary',
  badgeClassName: 'badge-soft-primary'
}, {
  title: 'Active Coupons',
  value: '830',
  change: 2.18,
  icon: 'circle-check',
  iconClassName: 'text-bg-success',
  badgeClassName: 'badge-soft-success'
}, {
  title: 'expired Coupons',
  value: '220',
  change: -1.64,
  icon: 'clock',
  iconClassName: 'text-bg-danger',
  badgeClassName: 'badge-soft-danger'
}, {
  title: 'Upcoming Coupons',
  value: '115',
  change: 0.93,
  icon: 'calendar-clock',
  iconClassName: 'text-bg-warning',
  badgeClassName: 'badge-soft-warning'
}, {
  title: 'Total Redemptions',
  value: '4,980',
  change: 6.12,
  icon: 'users',
  iconClassName: 'text-bg-info',
  badgeClassName: 'badge-soft-info'
}];
export const couponData = [{
  code: 'SAVE20',
  details: 'Applies to all products',
  discount: {
    type: 'percentage',
    value: '20%'
  },
  startDate: '1 May, 2025',
  expiryDate: '31 May, 2025',
  usageLimit: 500,
  used: 320,
  status: 'active'
}, {
  code: 'FREESHIP',
  details: 'Free shipping on orders over $100',
  discount: {
    type: 'free shipping',
    value: '-'
  },
  startDate: '15 Apr, 2025',
  expiryDate: '15 Jul, 2025',
  usageLimit: 'Unlimited',
  used: 230,
  status: 'upcoming'
}, {
  code: 'WELCOME10',
  details: 'New users get 10% off',
  discount: {
    type: 'percentage',
    value: '10%'
  },
  startDate: '1 Apr, 2025',
  expiryDate: '31 Dec, 2025',
  usageLimit: 1000,
  used: 754,
  status: 'active'
}, {
  code: 'SUMMER25',
  details: '25% off on all summer collections',
  discount: {
    type: 'percentage',
    value: '25%'
  },
  startDate: '10 May, 2025',
  expiryDate: '30 Jun, 2025',
  usageLimit: 800,
  used: 645,
  status: 'active'
}, {
  code: 'FLAT50',
  details: 'Flat $50 off on orders above $300',
  discount: {
    type: 'fixed',
    value: '$50'
  },
  startDate: '20 Mar, 2025',
  expiryDate: '20 Jul, 2025',
  usageLimit: 500,
  used: 370,
  status: 'active'
}, {
  code: 'WINTER15',
  details: '15% off on winter apparel',
  discount: {
    type: 'percentage',
    value: '15%'
  },
  startDate: '1 Dec, 2024',
  expiryDate: '28 Feb, 2025',
  usageLimit: 400,
  used: 400,
  status: 'expired'
}, {
  code: 'BULK30',
  details: '30% off for bulk orders over 10 items',
  discount: {
    type: 'percentage',
    value: '30%'
  },
  startDate: '5 Jun, 2025',
  expiryDate: '5 Aug, 2025',
  usageLimit: 200,
  used: 55,
  status: 'upcoming'
}, {
  code: 'NEWYEAR40',
  details: 'Flat 40% off for New Year Sale',
  discount: {
    type: 'percentage',
    value: '40%'
  },
  startDate: '25 Dec, 2024',
  expiryDate: '5 Jan, 2025',
  usageLimit: 1500,
  used: 1365,
  status: 'expired'
}, {
  code: 'APP20',
  details: '20% off for app users only',
  discount: {
    type: 'percentage',
    value: '20%'
  },
  startDate: '10 Oct, 2025',
  expiryDate: '31 Dec, 2025',
  usageLimit: 'Unlimited',
  used: 120,
  status: 'active'
}, {
  code: 'VIP100',
  details: 'Exclusive $100 off for VIP members',
  discount: {
    type: 'fixed',
    value: '$100'
  },
  startDate: '1 Jan, 2025',
  expiryDate: '31 Dec, 2025',
  usageLimit: 300,
  used: 85,
  status: 'active'
}, {
  code: 'FIRSTBUY15',
  details: '15% off for first purchase',
  discount: {
    type: 'percentage',
    value: '15%'
  },
  startDate: '1 Aug, 2025',
  expiryDate: '31 Dec, 2025',
  usageLimit: 'Unlimited',
  used: 310,
  status: 'active'
}, {
  code: 'FALL30',
  details: '30% off on Fall Collection',
  discount: {
    type: 'percentage',
    value: '30%'
  },
  startDate: '1 Sep, 2025',
  expiryDate: '30 Nov, 2025',
  usageLimit: 700,
  used: 180,
  status: 'upcoming'
}];