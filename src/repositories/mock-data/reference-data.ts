import type { Category } from '@/domain/Category'
import type { Client } from '@/domain/Client'
import type { Merchant } from '@/domain/Merchant'
import type { TransactionAccount } from '@/domain/Account'

// 5 bank (current/savings) accounts.
export const mockBankAccounts: readonly TransactionAccount[] = [
  { id: 'acct-hdfc-current', kind: 'bank', bankName: 'HDFC Bank', last4: '4292' },
  { id: 'acct-icici-current', kind: 'bank', bankName: 'ICICI Bank', last4: '1102' },
  { id: 'acct-axis-savings', kind: 'bank', bankName: 'Axis Bank', last4: '8812' },
  { id: 'acct-kotak-treasury', kind: 'bank', bankName: 'Kotak Bank', last4: '4001' },
  { id: 'acct-sbi-current', kind: 'bank', bankName: 'State Bank of India', last4: '7734' },
]

// 16 credit cards across issuers/networks.
export const mockCreditCards: readonly TransactionAccount[] = [
  {
    id: 'cc-hdfc-corp-plat',
    kind: 'credit_card',
    bankName: 'HDFC Bank',
    cardNetwork: 'VISA',
    last4: '4292',
  },
  {
    id: 'cc-hdfc-biz-gold',
    kind: 'credit_card',
    bankName: 'HDFC Bank',
    cardNetwork: 'Mastercard',
    last4: '5510',
  },
  {
    id: 'cc-icici-amex',
    kind: 'credit_card',
    bankName: 'ICICI Bank',
    cardNetwork: 'AMEX',
    last4: '1005',
  },
  {
    id: 'cc-icici-visa',
    kind: 'credit_card',
    bankName: 'ICICI Bank',
    cardNetwork: 'VISA',
    last4: '9981',
  },
  {
    id: 'cc-axis-magnus',
    kind: 'credit_card',
    bankName: 'Axis Bank',
    cardNetwork: 'VISA',
    last4: '8812',
  },
  {
    id: 'cc-axis-biz',
    kind: 'credit_card',
    bankName: 'Axis Bank',
    cardNetwork: 'Mastercard',
    last4: '2207',
  },
  {
    id: 'cc-kotak-white',
    kind: 'credit_card',
    bankName: 'Kotak Bank',
    cardNetwork: 'Mastercard',
    last4: '3390',
  },
  {
    id: 'cc-kotak-corp',
    kind: 'credit_card',
    bankName: 'Kotak Bank',
    cardNetwork: 'VISA',
    last4: '6644',
  },
  {
    id: 'cc-sbi-prime',
    kind: 'credit_card',
    bankName: 'State Bank of India',
    cardNetwork: 'VISA',
    last4: '0023',
  },
  {
    id: 'cc-sbi-elite',
    kind: 'credit_card',
    bankName: 'State Bank of India',
    cardNetwork: 'Mastercard',
    last4: '4471',
  },
  {
    id: 'cc-amex-gold',
    kind: 'credit_card',
    bankName: 'American Express',
    cardNetwork: 'AMEX',
    last4: '1120',
  },
  {
    id: 'cc-amex-plat',
    kind: 'credit_card',
    bankName: 'American Express',
    cardNetwork: 'AMEX',
    last4: '3003',
  },
  {
    id: 'cc-yes-marquee',
    kind: 'credit_card',
    bankName: 'Yes Bank',
    cardNetwork: 'VISA',
    last4: '7765',
  },
  {
    id: 'cc-indusind-legend',
    kind: 'credit_card',
    bankName: 'IndusInd Bank',
    cardNetwork: 'Mastercard',
    last4: '8890',
  },
  {
    id: 'cc-rbl-world',
    kind: 'credit_card',
    bankName: 'RBL Bank',
    cardNetwork: 'VISA',
    last4: '2456',
  },
  {
    id: 'cc-hsbc-premier',
    kind: 'credit_card',
    bankName: 'HSBC',
    cardNetwork: 'VISA',
    last4: '5567',
  },
]

export const mockAccounts: readonly TransactionAccount[] = [...mockBankAccounts, ...mockCreditCards]

export const mockClients: readonly Client[] = [
  { id: 'client-acme', name: 'Acme Corp' },
  { id: 'client-stellar', name: 'Stellar Ltd' },
  { id: 'client-vortex', name: 'Vortex AI' },
  { id: 'client-finstrat', name: 'FinStrat Solutions' },
  { id: 'client-solargrid', name: 'SolarGrid Energy' },
  { id: 'client-indologistics', name: 'Indo Logistics' },
  { id: 'client-nexus', name: 'Nexus Technology Corp' },
  { id: 'client-internal', name: 'Internal' },
]

export const mockCategories: readonly Category[] = [
  { id: 'cat-cloud', name: 'Cloud Infrastructure' },
  { id: 'cat-meals', name: 'Meals & Ent.' },
  { id: 'cat-travel', name: 'Travel' },
  { id: 'cat-saas', name: 'Software/SaaS' },
  { id: 'cat-statutory', name: 'Statutory' },
  { id: 'cat-marketing', name: 'Marketing' },
  { id: 'cat-office', name: 'Office Supplies' },
  { id: 'cat-payroll', name: 'Payroll' },
  { id: 'cat-utilities', name: 'Utilities' },
  { id: 'cat-professional', name: 'Professional Services' },
  { id: 'cat-taxes', name: 'Taxes & Govt' },
  { id: 'cat-insurance', name: 'Insurance' },
  { id: 'cat-rent', name: 'Rent' },
]

export const mockMerchants: readonly Merchant[] = [
  { id: 'merchant-aws', name: 'Amazon Web Services' },
  { id: 'merchant-gcp', name: 'Google Cloud Platform' },
  { id: 'merchant-bluetokai', name: 'Blue Tokai Coffee' },
  { id: 'merchant-uber', name: 'Uber India' },
  { id: 'merchant-digitalocean', name: 'DigitalOcean' },
  { id: 'merchant-starbucks', name: 'Starbucks Corporate' },
  { id: 'merchant-hdfc-insurance', name: 'HDFC Insurance Ltd' },
  { id: 'merchant-azure', name: 'Microsoft Azure' },
  { id: 'merchant-adobe', name: 'Adobe Creative Cloud' },
  { id: 'merchant-slack', name: 'Slack Technologies' },
  { id: 'merchant-razorpay', name: 'Razorpay Solutions' },
  { id: 'merchant-zomato', name: 'Zomato Enterprise' },
  { id: 'merchant-makemytrip', name: 'MakeMyTrip Biz' },
  { id: 'merchant-swiggy', name: 'Swiggy Ltd' },
  { id: 'merchant-gst', name: 'GST Council' },
  { id: 'merchant-zerodha', name: 'Zerodha Broking' },
  { id: 'merchant-google-workspace', name: 'Google Workspace' },
  { id: 'merchant-wework', name: 'WeWork' },
  { id: 'merchant-airtel', name: 'Airtel Business' },
]
