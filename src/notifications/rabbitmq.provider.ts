import {
  ClientProxyFactory,
  Transport,
  type ClientProxy,
  type RmqOptions,
} from '@nestjs/microservices';

export const RABBITMQ_NOTIFICATIONS_CLIENT = Symbol('RABBITMQ_NOTIFICATIONS_CLIENT');

type RabbitOverrides = Partial<RmqOptions['options']>;

export function buildRabbitMqOptions(overrides: RabbitOverrides = {}): RmqOptions {
  const urls = (process.env.RABBITMQ_URL ?? 'amqp://localhost:5672')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  const queue = process.env.RABBITMQ_NOTIFICATIONS_QUEUE ?? 'notifications';

  return {
    transport: Transport.RMQ,
    options: {
      urls,
      queue,
      queueOptions: {
        durable: true,
      },
      noAck: true,
      ...overrides,
    },
  };
}

export function createRabbitMqClient(): ClientProxy {
  return ClientProxyFactory.create(
    buildRabbitMqOptions({
      noAck: true,
    }),
  );
}
