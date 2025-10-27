import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type NotificationChannel = 'email' | 'sms' | 'push';

export interface NotificationRecord {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  status: 'queued' | 'sent' | 'failed';
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface CreateNotificationInput {
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly notifications: NotificationRecord[] = [];

  list(): NotificationRecord[] {
    return [...this.notifications];
  }

  enqueue(input: CreateNotificationInput): NotificationRecord {
    const record: NotificationRecord = {
      id: randomUUID(),
      channel: input.channel,
      recipient: input.recipient,
      subject: input.subject,
      body: input.body,
      status: 'queued',
      createdAt: new Date().toISOString(),
      metadata: input.metadata,
    };

    this.notifications.unshift(record);
    this.logger.debug(`Queued ${record.channel} notification to ${record.recipient}`);
    return record;
  }
}
