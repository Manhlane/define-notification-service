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
import { of, throwError } from 'rxjs';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockClient: jest.Mocked<ClientProxy>;

  beforeEach(() => {
    mockClient = {
      emit: jest.fn().mockReturnValue(of(null)),
      close: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    service = new NotificationsService(mockClient);
  });

  it('returns an empty list by default', () => {
    expect(service.list()).toEqual([]);
  });

  it('queues notifications and returns persisted records', async () => {
    const record = await service.enqueue({
      channel: 'email',
      recipient: 'user@example.com',
      subject: 'Welcome',
      body: 'Thanks for signing up!',
      metadata: { category: 'onboarding' },
    });

    expect(record).toMatchObject({
      channel: 'email',
      recipient: 'user@example.com',
      status: 'queued',
    });
    expect(typeof record.id).toBe('string');
    expect(service.list()).toEqual([record]);
    expect(mockClient.emit).toHaveBeenCalled();
  });

  it('logs but does not throw when publishing fails', async () => {
    mockClient.emit.mockReturnValueOnce(throwError(() => new Error('rmq down')));
    await expect(
      service.enqueue({
        channel: 'sms',
        recipient: '+2782',
        body: 'Test',
      }),
    ).resolves.toHaveProperty('channel', 'sms');
  });

  it('updates the status of an existing notification', async () => {
    const record = await service.enqueue({
      channel: 'push',
      recipient: 'user-123',
      body: 'Ping',
    });

    const updated = service.markStatus(record.id, 'sent');
    expect(updated?.status).toBe('sent');
    expect(service.list()[0].status).toBe('sent');
  });

  it('inserts fallback record when status update cannot find existing notification', () => {
    const fallback = {
      id: 'missing',
      channel: 'sms' as const,
      recipient: '+123',
      body: 'New',
      status: 'queued' as const,
      createdAt: new Date().toISOString(),
    };

    const inserted = service.markStatus('missing', 'sent', fallback);
    expect(inserted?.status).toBe('sent');
    expect(service.list()[0]).toMatchObject({ id: 'missing', status: 'sent' });
  });
});
