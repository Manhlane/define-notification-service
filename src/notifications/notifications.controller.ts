import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  CreateNotificationInput,
  NotificationRecord,
  NotificationsService,
} from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(): NotificationRecord[] {
    return this.notificationsService.list();
  }

  @Post()
  create(@Body() payload: CreateNotificationInput): NotificationRecord {
    return this.notificationsService.enqueue(payload);
  }
}
