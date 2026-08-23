import { InvoiceStatus, PaymentMethod } from '@/types';

/**
 * The life of an invoice. Every value but `void` is derived from what has been paid; `void` is the
 * one a person sets, with a reason. `draft` is reserved for an invoice still being assembled.
 */
export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
  VOID: 'void',
} as const satisfies Record<string, InvoiceStatus>;

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  unpaid: 'Unpaid',
  partial: 'Part paid',
  paid: 'Paid',
  void: 'Void',
};

/** The chip color for each status, so a paid bill and a voided one read apart at a glance. */
export const INVOICE_STATUS_VARIANTS: Record<InvoiceStatus, 'success' | 'warning' | 'neutral' | 'destructive'> = {
  draft: 'neutral',
  unpaid: 'warning',
  partial: 'warning',
  paid: 'success',
  void: 'destructive',
};

/** How a counter payment was taken. */
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  MOBILE: 'mobile',
  BANK: 'bank',
} as const satisfies Record<string, PaymentMethod>;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  mobile: 'Mobile money',
  bank: 'Bank transfer',
};

export const INVOICE_FIELD_LIMITS = {
  /** How many lines one invoice may carry — a bound against a runaway form, not a real ceiling. */
  LINES: 40,
  /** How many of one service a single line may bill. */
  MAX_QUANTITY: 999,
  /** A free-text payment reference (a receipt or transaction number). */
  PAYMENT_REFERENCE: 120,
  /** The reason a bill was voided — required, so a void is never unexplained. */
  VOID_REASON: 300,
} as const;

/**
 * The status filter for the invoices list — the five real statuses plus the shared "all" sentinel.
 * Kept as its own map so a screen never has to reach for the raw enum plus a magic string.
 */
export const INVOICE_STATUS_FILTERS = {
  ALL: 'all',
  DRAFT: 'draft',
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
  VOID: 'void',
} as const;
