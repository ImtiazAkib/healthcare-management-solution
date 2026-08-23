import { manualGateway } from './manual.gateway';

export type { PaymentGateway, PaymentIntent, PaymentOutcome } from './gateway.types';

/**
 * Whether payments are taken online. False in this build — everything is recorded at the counter.
 * A screen reads this to say so plainly rather than showing a dead "Pay now" button.
 */
export const isOnlinePaymentEnabled = false;

/**
 * The gateway the payment service uses.
 *
 * One binding, so adding a real provider is this line plus a new file and a webhook route — nothing
 * above the billing layer names how a payment is taken.
 */
export const gateway = manualGateway;
