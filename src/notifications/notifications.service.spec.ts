import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    service = new NotificationsService();
  });

  it('returns an empty list by default', () => {
    expect(service.list()).toEqual([]);
  });

  it('queues notifications and returns persisted records', () => {
    const record = service.enqueue({
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
  });
});
