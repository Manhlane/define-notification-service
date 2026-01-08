import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsConsumer } from './notifications.consumer';
import {
  RABBITMQ_NOTIFICATIONS_CLIENT,
  createRabbitMqClient,
} from './rabbitmq.provider';
import { MailgunService } from './mailgun.service';
import { EmailTemplateService } from './templates/email-template.service';
import { AuthNotificationsController } from './auth-notifications.controller';

@Module({
  controllers: [NotificationsController, AuthNotificationsController, NotificationsConsumer],
  providers: [
    {
      provide: RABBITMQ_NOTIFICATIONS_CLIENT,
      useFactory: createRabbitMqClient,
    },
    NotificationsService,
    MailgunService,
    EmailTemplateService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
