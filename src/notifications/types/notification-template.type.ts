export type AuthNotificationTemplate =
  | 'auth.welcome'
  | 'auth.verify-email'
  | 'auth.login-alert'
  | 'auth.password-reset'
  | 'auth.password-changed';

export type PaymentNotificationTemplate = 'payment.payment-link-created';

export type NotificationTemplate =
  | AuthNotificationTemplate
  | PaymentNotificationTemplate;
