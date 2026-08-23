/**
 * A message on its way out through a channel. The recipient's address for that channel — an email or
 * a phone number — plus what to say. No clinical content rides here.
 */
export type OutboundMessage = {
  to: string;
  subject: string;
  body: string;
};

/**
 * What a delivery attempt reports back. It **resolves rather than throws** on a refused send, so a
 * notification already written is never rolled back by a transient outage — the row is simply marked
 * failed with the reason.
 */
export type DeliveryResult = {
  delivered: boolean;
  reason?: string;
};

/**
 * The whole channel contract — one operation.
 *
 * Kept this narrow on purpose: adding a real SMS provider should be a new file bound in `index.ts`,
 * and that only holds if nothing above the channel depends on how the current one works. Nothing here
 * mentions email, SMS or a log.
 */
export type NotificationChannelDriver = {
  /**
   * Attempt to deliver a message, reporting success or a reason for failure rather than throwing.
   *
   * @param message - The address, subject and body.
   *
   * @returns Whether it was delivered, and why not when it was not.
   */
  deliver(message: OutboundMessage): Promise<DeliveryResult>;
};
