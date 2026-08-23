import { NotificationChannel } from '@/types';

import { NOTIFICATION_CHANNELS } from '@/constants/notification.const';

import { emailChannel } from './email.channel';
import { smsChannel } from './sms.channel';

import type { NotificationChannelDriver } from './notify.types';

export type { NotificationChannelDriver, OutboundMessage, DeliveryResult } from './notify.types';
export * from './notify.templates';
export { isSmsConfigured } from './sms.channel';

/**
 * The external driver for a channel, or null for in-app.
 *
 * In-app has no wire: its delivery is the row itself, which the bell reads, so there is nothing to
 * dispatch. Email and SMS return their drivers — one binding each, so swapping a transport is a new
 * file, not a change here.
 *
 * @param channel - The channel to deliver on.
 *
 * @returns The driver, or null for in-app.
 */
export function channelDriver(channel: NotificationChannel): NotificationChannelDriver | null {
  if (channel === NOTIFICATION_CHANNELS.EMAIL) {
    return emailChannel;
  }

  if (channel === NOTIFICATION_CHANNELS.SMS) {
    return smsChannel;
  }

  return null;
}
