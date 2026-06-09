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
import { PaymentNotificationsController } from './payment-notifications.controller';
import { NotificationsService } from './notifications.service';
import { RABBITMQ_NOTIFICATIONS_CLIENT } from './rabbitmq.provider';

describe('PaymentNotificationsController', () => {
  let controller: PaymentNotificationsController;
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentNotificationsController],
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

    controller = module.get<PaymentNotificationsController>(
      PaymentNotificationsController,
    );
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('queues a payment link email with metadata', async () => {
    const record = await controller.sendPaymentLinkCreated(
      {
        email: 'client@example.com',
        customerName: 'Thandi',
        paymentUrl: 'https://define.local/payment/dfn_example',
        serviceName: 'Wedding Photography - Full Day',
        providerName: 'Ava Studio',
        currency: 'ZAR',
        amount: 8500,
        paymentReference: 'DFN-2026-0001',
      },
      { headers: {}, socket: {} } as any,
    );

    expect(record.metadata).toMatchObject({
      template: 'payment.payment-link-created',
      data: expect.objectContaining({
        paymentUrl: 'https://define.local/payment/dfn_example',
        serviceName: 'Wedding Photography - Full Day',
      }),
    });
    expect(service.list()[0]).toEqual(record);
  });
});
