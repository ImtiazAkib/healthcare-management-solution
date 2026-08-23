/**
 * One message, already rendered.
 *
 * Both a text and an HTML body, because a verification link that only exists inside HTML is
 * unreachable from a plain-text client — and the whole point of this message is that the recipient
 * can act on it.
 */
export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * The whole mail contract — one operation.
 *
 * As narrow as the storage driver, for the same reason: swapping SMTP for an HTTP API should touch
 * one file, and that only holds if nothing above this layer knows which is in use. Nothing here
 * mentions a host, a port or an API key.
 *
 * It resolves rather than throws on a refused send, so a registration that succeeded is not rolled
 * back because a mail server was briefly unreachable. The caller decides what a failed send means;
 * for verification it means "offer a resend", not "lose the account".
 */
export type MailDriver = {
  /**
   * Send a message.
   *
   * @param message - The rendered message.
   *
   * @returns Whether it was accepted for delivery.
   */
  send(message: MailMessage): Promise<boolean>;
};
