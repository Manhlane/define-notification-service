import { NotificationChannel } from '../types/notification-channel.type';
import type { NotificationMetadata } from './notification-metadata.interface';

export interface NotificationRecord {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  status: 'queued' | 'sent' | 'failed';
  createdAt: string;
  metadata?: NotificationMetadata | Record<string, unknown>;
}
