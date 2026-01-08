import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import type { CreateNotificationInput } from './interfaces/create-notification-input.interface';
import type { NotificationRecord } from './interfaces/notification-record.interface';
import { RABBITMQ_NOTIFICATIONS_CLIENT } from './rabbitmq.provider';

@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly notifications: NotificationRecord[] = [];

  constructor(
    @Inject(RABBITMQ_NOTIFICATIONS_CLIENT)
    private readonly rabbitClient: ClientProxy,
  ) {}

  list(): NotificationRecord[] {
    return [...this.notifications];
  }

  async enqueue(input: CreateNotificationInput): Promise<NotificationRecord> {
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
    await this.publish(record);
    return record;
  }

  markStatus(
    id: string,
    status: NotificationRecord['status'],
    fallback?: NotificationRecord,
  ): NotificationRecord | undefined {
    const index = this.notifications.findIndex((item) => item.id === id);

    if (index === -1) {
      if (!fallback) {
        this.logger.warn(`Notification ${id} not found while updating status to ${status}.`);
        return undefined;
      }

      const resolvedFallback: NotificationRecord = {
        ...fallback,
        status,
        createdAt: fallback.createdAt ?? new Date().toISOString(),
      };
      this.notifications.unshift(resolvedFallback);
      this.logger.warn(
        `Notification ${id} was missing from in-memory store. Fallback record inserted.`,
      );
      return resolvedFallback;
    }

    const updated: NotificationRecord = {
      ...this.notifications[index],
      status,
    };

    this.notifications[index] = updated;
    this.logger.debug(`Notification ${id} status updated to ${status}.`);
    return updated;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.rabbitClient) {
      await this.rabbitClient.close();
    }
  }

  private async publish(record: NotificationRecord): Promise<void> {
    try {
      await lastValueFrom(
        this.rabbitClient.emit<NotificationRecord>('notifications.enqueue', record),
      );
    } catch (error) {
      const details =
        error instanceof Error
          ? error.stack ?? error.message
          : JSON.stringify(error, null, 2);
      this.logger.error(
        `Failed to publish notification ${record.id} to RabbitMQ`,
        details,
      );
    }
  }
}

export type { CreateNotificationInput, NotificationRecord };
