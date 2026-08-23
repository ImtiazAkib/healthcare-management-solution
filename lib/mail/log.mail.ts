import { createLoggerWithContext } from '@/lib/logger';

import type { MailDriver, MailMessage } from './mail.types';

const log = createLoggerWithContext('mail.log');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * The driver used when `MAIL_TRANSPORT` is `log` (the default).
 *
 * In development it writes the whole message — including the verification or reset link — to the
 * log, so the entire registration flow can be walked on a laptop with no SMTP credentials, no
 * sending domain and no third-party account.
 *
 * In production a `log` transport means SMTP was never set up. That is a misconfiguration, not a
 * workflow, so it is logged loudly — but never the body: it carries a live single-use token that
 * must not land in a production log where anyone with log access could redeem it before it expires.
 */
export const logMail: MailDriver = {
  async send(message: MailMessage): Promise<boolean> {
    if (isProduction) {
      log.error({ to: message.to, subject: message.subject }, 'Mail transport is "log" in production — message NOT sent');

      return true;
    }

    log.warn(
      { to: message.to, subject: message.subject, body: message.text },
      'Mail transport is "log" — the message was written to the log instead of sent'
    );

    return true;
  },
};
