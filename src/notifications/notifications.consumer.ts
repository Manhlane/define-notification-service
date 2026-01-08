import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationRecord, NotificationsService } from './notifications.service';
import { MailgunService } from './mailgun.service';
import { EmailTemplateService } from './templates/email-template.service';
import type { NotificationMetadata } from './interfaces/notification-metadata.interface';

@Controller()
export class NotificationsConsumer {
  private readonly logger = new Logger(NotificationsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly mailgunService: MailgunService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  @MessagePattern('notifications.enqueue')
  async handleNotification(@Payload() record: NotificationRecord): Promise<void> {
    if (!record?.id) {
      this.logger.warn('Received malformed notification payload, skipping ack.');
      return;
    }

    this.logger.debug(`Processing notification ${record.id} from queue.`);

    try {
      if (record.channel !== 'email') {
        this.logger.warn(`Unsupported notification channel ${record.channel}, marking as failed.`);
        this.notificationsService.markStatus(record.id, 'failed', record);
        return;
      }

      let subject = record.subject ?? 'Define notification';
      let html = `<p>${record.body}</p>`;
      let text = record.body;

      const structuredMetadata = this.isStructuredMetadata(record.metadata);

      if (structuredMetadata) {
        const compiled = await this.emailTemplateService.render(structuredMetadata);
        subject = compiled.subject ?? subject;
        html = compiled.html ?? html;
        text = compiled.text ?? text;
      }

      await this.mailgunService.sendEmail({
        to: record.recipient,
        subject,
        html,
        text,
      });

      this.notificationsService.markStatus(record.id, 'sent', record);
    } catch (error) {
      const detail = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(
        `Failed to deliver notification ${record.id} (${record.channel}): ${detail}`,
      );
      this.notificationsService.markStatus(record.id, 'failed', record);
    }
  }

  private isStructuredMetadata(
    metadata: NotificationRecord['metadata'],
  ): NotificationMetadata | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    if ('template' in metadata && 'data' in metadata) {
      return metadata as NotificationMetadata;
    }

    return undefined;
  }
}
