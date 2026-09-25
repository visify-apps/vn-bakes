/**
 * @typedef {'fixed' | 'starting_from' | 'enquiry'} PriceType
 * @typedef {'NEW' | 'REVIEWING' | 'QUOTE_SENT' | 'CUSTOMER_CONFIRMED' | 'ADVANCE_PENDING' | 'CONFIRMED' | 'IN_PREPARATION' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'} EnquiryStatus
 * @typedef {'UNPAID' | 'ADVANCE_PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED'} PaymentStatus
 */

export const ENQUIRY_STATUSES = [
  'NEW',
  'REVIEWING',
  'QUOTE_SENT',
  'CUSTOMER_CONFIRMED',
  'ADVANCE_PENDING',
  'CONFIRMED',
  'IN_PREPARATION',
  'READY',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
]

export const PRICE_TYPES = ['fixed', 'starting_from', 'enquiry']

export const PAYMENT_STATUSES = [
  'UNPAID',
  'ADVANCE_PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'REFUNDED',
]

export const ORDER_STATUSES = [
  'CONFIRMED',
  'IN_PREPARATION',
  'READY',
  'COMPLETED',
  'CANCELLED',
]
