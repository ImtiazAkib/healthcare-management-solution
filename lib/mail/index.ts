import { env } from '@/env/server';

import { logMail } from './log.mail';
import { smtpMail } from './smtp.mail';

import type { MailDriver } from './mail.types';

export type { MailDriver, MailMessage } from './mail.types';
export * from './mail.templates';

/**
 * Whether a real transport is in use.
 *
 * Exported because it is worth showing rather than hiding: a screen can tell a developer that the
 * link went to the log instead of an inbox, which is the difference between "the email is slow" and
 * "there is no mail server".
 */
export const isMailConfigured = env.MAIL_TRANSPORT === 'smtp';

/**
 * The driver the app uses.
 *
 * One binding, so swapping transports is this line plus a new file — nothing above the mail layer
 * names SMTP. Chosen by `MAIL_TRANSPORT`, which defaults to `log` so the whole registration flow can
 * be walked on a laptop with no credentials.
 */
export const mail: MailDriver = isMailConfigured ? smtpMail : logMail;
