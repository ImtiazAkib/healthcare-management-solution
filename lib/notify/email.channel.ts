import { mail } from '@/lib/mail';

import type { NotificationChannelDriver } from './notify.types';

/**
 * Escape text destined for an HTML body. The subject and body are system-generated, but they can
 * carry a name pulled from a record, so they are escaped rather than trusted.
 *
 * @param value - Text to escape.
 *
 * @returns The same text, safe to interpolate.
 */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * The email channel: delivers a notification through the app's mail transport (log or SMTP).
 *
 * It reuses the same transport self-registration uses, so with `MAIL_TRANSPORT=log` a notification
 * email is readable in the log with no server. `mail.send` resolves rather than throws, and a
 * `false` becomes a delivery failure with a reason rather than an exception that would roll the
 * notification row back.
 */
export const emailChannel: NotificationChannelDriver = {
  async deliver(message) {
    const delivered = await mail.send({
      to: message.to,
      subject: message.subject,
      text: message.body,
      html: `<p style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6">${escapeHtml(message.body)}</p>`,
    });

    return delivered ? { delivered: true } : { delivered: false, reason: 'The mail transport refused the message.' };
  },
};
