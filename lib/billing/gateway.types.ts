import type { PaymentMethod } from '@/types';

/**
 * A payment to take: how much, how, and the reference it carries.
 */
export type PaymentIntent = {
  amountMinorUnits: number;
  method: PaymentMethod;
  reference?: string;
};

/**
 * What taking a payment reported back. It **resolves rather than throws** on a refusal, so a payment
 * service records the outcome either way rather than a thrown gateway error rolling back a payment
 * that a real provider may in fact have taken.
 */
export type PaymentOutcome = {
  captured: boolean;
  /** The provider's reference for the payment, or the one supplied at the counter, or null. */
  reference: string | null;
  failureReason?: string;
};

/**
 * The whole payment contract — one operation.
 *
 * Kept this narrow on purpose: a real online provider is a second implementation bound in `index.ts`
 * plus a webhook route, and the payment service does not change. Nothing here names a provider.
 */
export type PaymentGateway = {
  /**
   * Take (or record) a payment, reporting whether it was captured.
   *
   * @param intent - The amount, method and reference.
   *
   * @returns Whether it was captured, and a reference for it.
   */
  capture(intent: PaymentIntent): Promise<PaymentOutcome>;
};
