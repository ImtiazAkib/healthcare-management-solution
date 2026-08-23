import { env } from '@/env/server';

import { logChannel } from './log.channel';

import type { NotificationChannelDriver } from './notify.types';

/**
 * Whether a real SMS transport is in use.
 *
 * Exported because it is worth showing rather than hiding: a screen can tell that a message went to
 * the log instead of a handset, which is the difference between "the SMS is slow" and "there is no
 * SMS provider". It stays false until a provider driver is bound below.
 */
export const isSmsConfigured = env.SMS_TRANSPORT !== 'log';

/**
 * The SMS channel.
 *
 * Only the logging transport ships — a real provider (Twilio and the like) is a new driver bound on
 * this line, exactly the way SMTP was for mail. Until then even a configured transport writes to the
 * log rather than a handset, and `isSmsConfigured` is what a caller checks before claiming an SMS was
 * delivered. The call sites and the records are real; the wire is not, yet.
 */
export const smsChannel: NotificationChannelDriver = logChannel;
