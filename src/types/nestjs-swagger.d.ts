declare module '@nestjs/swagger' {
  export class DocumentBuilder {
    setTitle(title: string): this;
    setDescription(description: string): this;
    setVersion(version: string): this;
    addTag(name: string): this;
    build(): Record<string, unknown>;
  }

  export const SwaggerModule: {
    createDocument(app: unknown, config: Record<string, unknown>): Record<string, unknown>;
    setup(path: string, app: unknown, document: Record<string, unknown>, options?: Record<string, unknown>): void;
  };

  export function ApiTags(...tags: string[]): ClassDecorator;
  export function ApiOkResponse(options?: Record<string, unknown>): MethodDecorator;
  export function ApiCreatedResponse(options?: Record<string, unknown>): MethodDecorator;
  export function ApiBody(options?: Record<string, unknown>): MethodDecorator;
  export function ApiProperty(options?: Record<string, unknown>): PropertyDecorator;
}
