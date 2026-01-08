import type { NotificationTemplate } from '../types/notification-template.type';

export type AuthTemplatePayloadMap = {
  'auth.welcome': {
    name?: string;
    verificationUrl?: string;
    dashboardUrl?: string;
  };
  'auth.verify-email': {
    name?: string;
    verificationUrl: string;
    helpUrl?: string;
  };
  'auth.login-alert': {
    name?: string;
    location?: string;
    ipAddress?: string;
    device?: string;
    loginAt?: string;
  };
  'auth.password-reset': {
    name?: string;
    resetUrl: string;
    expiresInMinutes?: number;
    supportUrl?: string;
  };
  'auth.password-changed': {
    name?: string;
    changedAt?: string;
    supportUrl?: string;
    loginActivityUrl?: string;
  };
};

export type NotificationMetadataMap = AuthTemplatePayloadMap;

export type NotificationMetadata<T extends NotificationTemplate = NotificationTemplate> = {
  template: T;
  data: NotificationMetadataMap[T];
};
