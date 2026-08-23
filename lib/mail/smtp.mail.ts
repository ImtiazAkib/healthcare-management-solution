import nodemailer from 'nodemailer';

import { env } from '@/env/server';

import { createLoggerWithContext } from '@/lib/logger';

import type { MailDriver, MailMessage } from './mail.types';
import type { Transporter } from 'nodemailer';

const log = createLoggerWithContext('mail.smtp');

/*
  Built once and reused. Nodemailer pools connections per transporter, so creating one per message
  would open a new TCP and TLS handshake for every email.

  Lazily, though: the module is imported wherever `lib/mail` is, including on requests that never
  send anything, and a transporter built at import time would connect on a page render that had no
  business talking to a mail server.
*/
let transporter: Transporter | null = null;

function resolveTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    // Implicit TLS on 465, STARTTLS upgrade on 587 — the port decides, as it does everywhere.
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });

  return transporter;
}

/**
 * Sends over SMTP, which works with anything — a departmental mail server, an institutional account,
 * or a provider's relay — without a verified sending domain or a third-party API key. The interface
 * is one method, so swapping to an HTTP API later is a new file and one line in `index.ts`.
 */
export const smtpMail: MailDriver = {
  async send(message: MailMessage): Promise<boolean> {
    try {
      await resolveTransporter().sendMail({
        from: env.SMTP_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      return true;
    } catch (error) {
      /*
        Logged and reported, never thrown. A registration that has already written a row must not be
        undone because a mail server was briefly unreachable — the caller turns a false into "we
        could not send that, try again", which is a far better outcome than an account that half
        exists. Only the error is logged, not the recipient or subject, which over a run of failures
        would accumulate into a record of who registered.
      */
      log.error({ err: error }, 'Sending mail failed');

      return false;
    }
  },
};
