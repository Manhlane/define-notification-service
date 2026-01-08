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

jest.mock(
  '@nestjs/swagger',
  () => ({
    ApiTags: () => () => undefined,
    ApiOkResponse: () => () => undefined,
    ApiCreatedResponse: () => () => undefined,
    ApiBody: () => () => undefined,
    ApiProperty: () => () => undefined,
  }),
  { virtual: true },
);

import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { NotificationsController } from './notifications.controller';
import { RABBITMQ_NOTIFICATIONS_CLIENT } from './rabbitmq.provider';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        NotificationsService,
        {
          provide: RABBITMQ_NOTIFICATIONS_CLIENT,
          useValue: {
            emit: jest.fn().mockReturnValue(of(null)),
            close: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('exposes queued notifications', async () => {
    await service.enqueue({
      channel: 'push',
      recipient: 'user-id',
      body: 'You have a new message',
    });

    const all = controller.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].channel).toBe('push');
  });

  it('queues notifications from POST payload', async () => {
    const record = await controller.create({
      channel: 'sms',
      recipient: '+1234567',
      body: 'Two factor code: 123456',
    });

    expect(record.channel).toBe('sms');
    expect(service.list()).toContainEqual(record);
  });
});
