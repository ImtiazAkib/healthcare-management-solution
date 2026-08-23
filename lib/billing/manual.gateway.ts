import type { PaymentGateway } from './gateway.types';

/**
 * The counter gateway: it records a payment already taken at the desk rather than processing one.
 *
 * The money changed hands in cash, on a card machine, or by a transfer whose reference the cashier
 * types in — so there is nothing to authorize here, and the capture always succeeds. A real online
 * provider (which does authorize) is a second implementation behind the same interface, plus a
 * webhook route to confirm asynchronously; the payment service treats both the same.
 */
export const manualGateway: PaymentGateway = {
  async capture(intent) {
    return { captured: true, reference: intent.reference?.trim() || null };
  },
};
