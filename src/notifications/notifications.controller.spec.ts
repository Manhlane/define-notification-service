import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [NotificationsService],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('exposes queued notifications', () => {
    service.enqueue({
      channel: 'push',
      recipient: 'user-id',
      body: 'You have a new message',
    });

    const all = controller.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].channel).toBe('push');
  });

  it('queues notifications from POST payload', () => {
    const record = controller.create({
      channel: 'sms',
      recipient: '+1234567',
      body: 'Two factor code: 123456',
    });

    expect(record.channel).toBe('sms');
    expect(service.list()).toContainEqual(record);
  });
});
