import express from '@admin/assets/images/cards/american-express.svg';
import discover from '@admin/assets/images/cards/discover-card.svg';
import mastercard from '@admin/assets/images/cards/mastercard.svg';
import visa from '@admin/assets/images/cards/visa.svg';
export const bankAccountData = [{
  name: 'Chase Bank',
  balance: '$12,875.61',
  holder: 'John Doe',
  accountNo: '1234 5678 2045',
  type: 'Checking',
  branch: 'New York Downtown',
  status: 'active',
  icon: 'building-bank',
  iconClassName: 'bg-primary-subtle text-primary'
}, {
  name: 'Bank of America',
  balance: '$9,432.18',
  holder: 'Emily Smith',
  accountNo: '9876 5432 1089',
  type: 'Savings',
  branch: 'Los Angeles Central',
  status: 'inactive',
  icon: 'building-bank',
  iconClassName: 'bg-info-subtle text-info'
}, {
  name: 'Wells Fargo',
  balance: '$18,210.42',
  holder: 'Michael Johnson',
  accountNo: '4455 2299 6574',
  type: 'Business',
  branch: 'Chicago West Loop',
  status: 'active',
  icon: 'building-bank',
  iconClassName: 'bg-danger-subtle text-danger '
}];
export const paymentCardData = [{
  brand: 'Visa',
  image: visa,
  number: '**** **** **** 3294',
  expiryDate: '08/28',
  holder: 'John Miller',
  status: 'active'
}, {
  brand: 'MasterCard',
  image: mastercard,
  number: '**** **** **** 7841',
  expiryDate: '12/26',
  holder: 'Emma Thompson',
  status: 'active'
}, {
  brand: 'American Express',
  image: express,
  number: '**** **** **** 4428',
  expiryDate: '03/27',
  holder: 'Liam Carter',
  status: 'inactive'
}, {
  brand: 'Discover',
  image: discover,
  number: '**** **** **** 9812',
  expiryDate: '11/24',
  holder: 'Sophia Lewis',
  status: 'expired'
}];