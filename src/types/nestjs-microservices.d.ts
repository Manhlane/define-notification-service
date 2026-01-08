declare module '@nestjs/microservices' {
  import type { Observable } from 'rxjs';

  export interface ClientProxy {
    emit<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult>;
    close(): Promise<void>;
  }

  export interface RmqOptions {
    transport: Transport;
    options: Record<string, unknown>;
  }

  export interface RmqContext {
    getChannelRef(): { ack(message: unknown): void };
    getMessage(): unknown;
  }

  export const ClientProxyFactory: {
    create(options: RmqOptions): ClientProxy;
  };

  export enum Transport {
    RMQ = 'RMQ',
  }

  export type MicroserviceOptions = RmqOptions;

  export function MessagePattern(pattern: string | Record<string, unknown>): MethodDecorator;
  export function Ctx(): ParameterDecorator;
  export function Payload(): ParameterDecorator;
}
