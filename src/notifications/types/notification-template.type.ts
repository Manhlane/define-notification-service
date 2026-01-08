export type AuthNotificationTemplate =
  | 'auth.welcome'
  | 'auth.verify-email'
  | 'auth.login-alert'
  | 'auth.password-reset'
  | 'auth.password-changed';

export type NotificationTemplate = AuthNotificationTemplate;
