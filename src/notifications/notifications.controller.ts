import { Body, Controller, Get, Post, Logger, Req } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiProperty,
} from '@nestjs/swagger';
import {
  CreateNotificationInput,
  NotificationRecord,
  NotificationsService,
} from './notifications.service';
import { Request } from 'express';

export class CreateNotificationDto implements CreateNotificationInput {
  @ApiProperty({ enum: ['email', 'sms', 'push'] })
  channel!: 'email' | 'sms' | 'push';

  @ApiProperty({ description: 'Destination email address, phone number, or user id' })
  recipient!: string;

  @ApiProperty({ required: false })
  subject?: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ required: false, type: Object })
  metadata?: Record<string, unknown>;
}

export class NotificationRecordDto implements NotificationRecord {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['email', 'sms', 'push'] })
  channel!: 'email' | 'sms' | 'push';

  @ApiProperty()
  recipient!: string;

  @ApiProperty({ required: false })
  subject?: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ enum: ['queued', 'sent', 'failed'] })
  status!: 'queued' | 'sent' | 'failed';

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ required: false, type: Object })
  metadata?: Record<string, unknown>;
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  private extractRequestMeta(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip =
      forwardedValue?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      undefined;
    const userAgent = req.headers['user-agent'];
    return {
      ip,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    };
  }

  private safeTemplate(metadata?: Record<string, unknown>) {
    const template = metadata?.template;
    return typeof template === 'string' ? template : undefined;
  }

  private logAudit(event: string, details: Record<string, unknown>) {
    this.logger.log({ event, ...details });
  }

  private logAuditFailure(
    event: string,
    details: Record<string, unknown>,
    error: unknown,
  ) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    const status =
      typeof (error as any)?.status === 'number'
        ? (error as any).status
        : undefined;
    this.logger.warn({ event, error: errorName, status, ...details });
  }

  @ApiOkResponse({ type: NotificationRecordDto, isArray: true })
  @Get()
  findAll(@Req() req: Request): NotificationRecord[] {
    const meta = this.extractRequestMeta(req);
    const records = this.notificationsService.list();
    this.logAudit('NOTIFICATIONS_LISTED', {
      count: records.length,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return records;
  }

  @ApiBody({ type: CreateNotificationDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  @Post()
  async create(
    @Body() payload: CreateNotificationDto,
    @Req() req: Request,
  ): Promise<NotificationRecord> {
    const meta = this.extractRequestMeta(req);
    try {
      const record = await this.notificationsService.enqueue(payload);
      this.logAudit('NOTIFICATION_ENQUEUED', {
        channel: payload.channel,
        recipient: payload.recipient,
        template: this.safeTemplate(payload.metadata),
        notificationId: record.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return record;
    } catch (error) {
      this.logAuditFailure(
        'NOTIFICATION_ENQUEUE_FAILED',
        {
          channel: payload.channel,
          recipient: payload.recipient,
          template: this.safeTemplate(payload.metadata),
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
        error,
      );
      throw error;
    }
  }
}
