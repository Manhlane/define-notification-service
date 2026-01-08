jest.mock(
  '@nestjs/microservices',
  () => ({
    ClientProxyFactory: { create: jest.fn() },
    Transport: { RMQ: 'RMQ' },
    MessagePattern: () => () => undefined,
    Payload: () => () => undefined,
    Ctx: () => () => undefined,
  }),
  { virtual: true },
);

import type { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import { NotificationsConsumer } from './notifications.consumer';
import { NotificationsService } from './notifications.service';
import { MailgunService } from './mailgun.service';
import { EmailTemplateService } from './templates/email-template.service';

describe('NotificationsConsumer', () => {
  let service: NotificationsService;
  let consumer: NotificationsConsumer;
  let mockClient: jest.Mocked<ClientProxy>;
  let mailgunService: jest.Mocked<MailgunService>;
  let templateService: jest.Mocked<EmailTemplateService>;

  beforeEach(() => {
    mockClient = {
      emit: jest.fn().mockReturnValue(of(null)),
      close: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    service = new NotificationsService(mockClient);
    mailgunService = {
      sendEmail: jest.fn().mockResolvedValue('msg'),
      isEnabled: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<MailgunService>;
    templateService = {
      render: jest.fn().mockResolvedValue({
        subject: 'Rendered',
        html: '<p>Rendered</p>',
        text: 'Rendered',
      }),
    } as unknown as jest.Mocked<EmailTemplateService>;

    consumer = new NotificationsConsumer(service, mailgunService, templateService);
  });

  it('sends rendered email content via Mailgun', async () => {
    const record = await service.enqueue({
      channel: 'email',
      recipient: 'user@example.com',
      body: 'Hello!',
      metadata: {
        template: 'auth.login-alert',
        data: {
          loginAt: new Date().toISOString(),
        },
      },
    });

    await consumer.handleNotification(record);

    expect(service.list()[0].status).toBe('sent');
    expect(mailgunService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Rendered',
      })
    );
  });

  it('skips ack when record id is missing', async () => {
    await consumer.handleNotification({} as any);

    expect(service.list()).toEqual([]);
  });

  it('marks non-email channels as failed', async () => {
    const record = await service.enqueue({
      channel: 'sms',
      recipient: '+123',
      body: 'Test',
    });

    await consumer.handleNotification(record);

    expect(service.list()[0].status).toBe('failed');
    expect(mailgunService.sendEmail).not.toHaveBeenCalled();
  });

  it('falls back to basic body when metadata is missing', async () => {
    const record = await service.enqueue({
      channel: 'email',
      recipient: 'user@example.com',
      body: 'Fallback',
    });

    templateService.render.mockReset();

    await consumer.handleNotification(record);

    expect(mailgunService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: '<p>Fallback</p>',
        text: 'Fallback',
      })
    );
  });

  it('marks notification as failed when Mailgun throws', async () => {
    const record = await service.enqueue({
      channel: 'email',
      recipient: 'user@example.com',
      body: 'Test',
      metadata: {
        template: 'auth.welcome',
        data: {},
      },
    });

    mailgunService.sendEmail.mockRejectedValueOnce(new Error('mailgun down'));

    await consumer.handleNotification(record);
    expect(service.list()[0].status).toBe('failed');
  });
});
