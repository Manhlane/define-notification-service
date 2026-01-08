import { Body, Controller, Get, Post } from '@nestjs/common';
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
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOkResponse({ type: NotificationRecordDto, isArray: true })
  @Get()
  findAll(): NotificationRecord[] {
    return this.notificationsService.list();
  }

  @ApiBody({ type: CreateNotificationDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  @Post()
  async create(@Body() payload: CreateNotificationDto): Promise<NotificationRecord> {
    return this.notificationsService.enqueue(payload);
  }
}
