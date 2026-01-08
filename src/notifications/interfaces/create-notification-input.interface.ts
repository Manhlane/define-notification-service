import { NotificationChannel } from '../types/notification-channel.type';
import type { NotificationMetadata } from './notification-metadata.interface';

export interface CreateNotificationInput {
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  metadata?: NotificationMetadata | Record<string, unknown>;
}
