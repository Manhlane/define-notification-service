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
    ApiBody: () => () => undefined,
    ApiOkResponse: () => () => undefined,
    ApiCreatedResponse: () => () => undefined,
    ApiProperty: () => () => undefined,
  }),
  { virtual: true },
);

import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { AuthNotificationsController } from './auth-notifications.controller';
import { NotificationsService } from './notifications.service';
import { RABBITMQ_NOTIFICATIONS_CLIENT } from './rabbitmq.provider';

describe('AuthNotificationsController', () => {
  let controller: AuthNotificationsController;
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthNotificationsController],
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

    controller = module.get<AuthNotificationsController>(AuthNotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('queues a welcome email with metadata', async () => {
    const record = await controller.sendWelcome(
      {
        email: 'user@example.com',
        name: 'User',
        verificationUrl: 'https://app.define.local/verify',
      },
      { headers: {}, socket: {} } as any,
    );

    expect(record.metadata).toMatchObject({
      template: 'auth.welcome',
    });
    expect(service.list()[0]).toEqual(record);
  });

  it('queues a password reset email with link metadata', async () => {
    const record = await controller.sendPasswordReset(
      {
        email: 'user@example.com',
        resetUrl: 'https://define.local/reset?token=123',
        expiresInMinutes: 30,
      },
      { headers: {}, socket: {} } as any,
    );

    expect(record.metadata).toMatchObject({
      template: 'auth.password-reset',
      data: expect.objectContaining({ resetUrl: 'https://define.local/reset?token=123' }),
    });
  });

  it('queues a password changed confirmation email', async () => {
    const record = await controller.sendPasswordChanged(
      {
        email: 'user@example.com',
        name: 'User',
        changedAt: '2024-02-10T12:00:00.000Z',
      },
      { headers: {}, socket: {} } as any,
    );

    expect(record.metadata).toMatchObject({
      template: 'auth.password-changed',
    });
  });
});
