import { createLoggerWithContext } from '@/lib/logger';

import type { NotificationChannelDriver } from './notify.types';

const log = createLoggerWithContext('notify.log');

const production = process.env.NODE_ENV === 'production';

/**
 * The logging channel: writes the message to the log instead of sending it.
 *
 * It is what the SMS channel uses until a provider is supplied, and a safe fallback anywhere. In
 * development it logs the address and body so a developer can read exactly what would have gone out;
 * in production it logs neither — a recipient's address and a message body are not something a log
 * line should carry — and records only that a message passed through.
 *
 * It always reports delivered: the log never refuses. Whether that counts as a real send is a
 * question the caller answers by checking `isSmsConfigured`, not something this pretends about.
 */
export const logChannel: NotificationChannelDriver = {
  async deliver(message) {
    if (production) {
      log.info({ subject: message.subject }, 'Notification passed to the log transport');
    } else {
      log.info({ to: message.to, subject: message.subject, body: message.body }, 'Notification (log transport — not sent)');
    }

    return { delivered: true };
  },
};
