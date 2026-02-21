import { Body, Controller, Post, Logger, Req } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import type { NotificationRecord } from './notifications.service';
import { NotificationsService } from './notifications.service';
import { NotificationRecordDto } from './notifications.controller';
import { Request } from 'express';

class BaseAuthNotificationDto {
  @ApiProperty({ description: 'Recipient email address' })
  email!: string;

  @ApiProperty({ required: false, description: 'Recipient name' })
  name?: string;
}

class WelcomeEmailDto extends BaseAuthNotificationDto {
  @ApiProperty({
    required: false,
    description: 'Link to verify the new account before entering the dashboard',
  })
  verificationUrl?: string;

  @ApiProperty({
    required: false,
    description: 'Optional link that routes directly to the dashboard',
  })
  dashboardUrl?: string;
}

class VerifyEmailDto extends BaseAuthNotificationDto {
  @ApiProperty({ description: 'Verification URL embedded in the email CTA' })
  verificationUrl!: string;

  @ApiProperty({ required: false, description: 'Help center or support URL' })
  helpUrl?: string;
}

class LoginAlertEmailDto extends BaseAuthNotificationDto {
  @ApiProperty({ required: false, description: 'Login location as determined by the client' })
  location?: string;

  @ApiProperty({ required: false })
  ipAddress?: string;

  @ApiProperty({ required: false })
  device?: string;

  @ApiProperty({ required: false, description: 'ISO timestamp of the login event' })
  loginAt?: string;
}

class PasswordResetEmailDto extends BaseAuthNotificationDto {
  @ApiProperty({ description: 'Password reset link pointing back to the frontend' })
  resetUrl!: string;

  @ApiProperty({ required: false, description: 'Link expiration in minutes' })
  expiresInMinutes?: number;

  @ApiProperty({ required: false, description: 'Support URL to surface in the template footer' })
  supportUrl?: string;
}

class PasswordChangedEmailDto extends BaseAuthNotificationDto {
  @ApiProperty({ required: false, description: 'ISO timestamp of the password change event' })
  changedAt?: string;

  @ApiProperty({ required: false, description: 'Link to security settings or login activity' })
  loginActivityUrl?: string;

  @ApiProperty({ required: false, description: 'Support URL highlighted in the email' })
  supportUrl?: string;
}

@ApiTags('auth-notifications')
@Controller('notifications/auth')
export class AuthNotificationsController {
  private readonly logger = new Logger(AuthNotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  private extractRequestMeta(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip =
      forwardedValue?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      undefined;
    const userAgent = req.headers['user-agent'];
    return {
      ip,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    };
  }

  private logAudit(event: string, details: Record<string, unknown>) {
    this.logger.log({ event, ...details });
  }

  private logAuditFailure(
    event: string,
    details: Record<string, unknown>,
    error: unknown,
  ) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    const status =
      typeof (error as any)?.status === 'number'
        ? (error as any).status
        : undefined;
    this.logger.warn({ event, error: errorName, status, ...details });
  }

  @Post('welcome')
  @ApiBody({ type: WelcomeEmailDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  async sendWelcome(
    @Body() dto: WelcomeEmailDto,
    @Req() req: Request,
  ): Promise<NotificationRecord> {
    const meta = this.extractRequestMeta(req);
    try {
      const record = await this.notificationsService.enqueue({
        channel: 'email',
        recipient: dto.email,
        subject: `Welcome to Define`,
        body: `Welcome email queued for ${dto.email}`,
        metadata: {
          template: 'auth.welcome',
          data: {
            name: dto.name,
            verificationUrl: dto.verificationUrl,
            dashboardUrl: dto.dashboardUrl,
          },
        },
      });
      this.logAudit('AUTH_WELCOME_ENQUEUED', {
        template: 'auth.welcome',
        recipient: dto.email,
        notificationId: record.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return record;
    } catch (error) {
      this.logAuditFailure(
        'AUTH_WELCOME_FAILED',
        { template: 'auth.welcome', recipient: dto.email, ip: meta.ip, userAgent: meta.userAgent },
        error,
      );
      throw error;
    }
  }

  @Post('verify-email')
  @ApiBody({ type: VerifyEmailDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  async sendVerification(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request,
  ): Promise<NotificationRecord> {
    const meta = this.extractRequestMeta(req);
    try {
      const record = await this.notificationsService.enqueue({
        channel: 'email',
        recipient: dto.email,
        subject: 'Verify your email',
        body: `Verification email queued for ${dto.email}`,
        metadata: {
          template: 'auth.verify-email',
          data: {
            name: dto.name,
            verificationUrl: dto.verificationUrl,
            helpUrl: dto.helpUrl,
          },
        },
      });
      this.logAudit('AUTH_VERIFY_EMAIL_ENQUEUED', {
        template: 'auth.verify-email',
        recipient: dto.email,
        notificationId: record.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return record;
    } catch (error) {
      this.logAuditFailure(
        'AUTH_VERIFY_EMAIL_FAILED',
        { template: 'auth.verify-email', recipient: dto.email, ip: meta.ip, userAgent: meta.userAgent },
        error,
      );
      throw error;
    }
  }

  @Post('login-alert')
  @ApiBody({ type: LoginAlertEmailDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  async sendLoginAlert(
    @Body() dto: LoginAlertEmailDto,
    @Req() req: Request,
  ): Promise<NotificationRecord> {
    const meta = this.extractRequestMeta(req);
    try {
      const record = await this.notificationsService.enqueue({
        channel: 'email',
        recipient: dto.email,
        subject: 'New Define login detected',
        body: `Login alert queued for ${dto.email}`,
        metadata: {
          template: 'auth.login-alert',
          data: {
            name: dto.name,
            location: dto.location,
            ipAddress: dto.ipAddress,
            device: dto.device,
            loginAt: dto.loginAt ?? new Date().toISOString(),
          },
        },
      });
      this.logAudit('AUTH_LOGIN_ALERT_ENQUEUED', {
        template: 'auth.login-alert',
        recipient: dto.email,
        notificationId: record.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return record;
    } catch (error) {
      this.logAuditFailure(
        'AUTH_LOGIN_ALERT_FAILED',
        { template: 'auth.login-alert', recipient: dto.email, ip: meta.ip, userAgent: meta.userAgent },
        error,
      );
      throw error;
    }
  }

  @Post('password-reset')
  @ApiBody({ type: PasswordResetEmailDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  async sendPasswordReset(
    @Body() dto: PasswordResetEmailDto,
    @Req() req: Request,
  ): Promise<NotificationRecord> {
    const meta = this.extractRequestMeta(req);
    try {
      const record = await this.notificationsService.enqueue({
        channel: 'email',
        recipient: dto.email,
        subject: 'Reset your password',
        body: `Password reset email queued for ${dto.email}`,
        metadata: {
          template: 'auth.password-reset',
          data: {
            name: dto.name,
            resetUrl: dto.resetUrl,
            expiresInMinutes: dto.expiresInMinutes,
            supportUrl: dto.supportUrl,
          },
        },
      });
      this.logAudit('AUTH_PASSWORD_RESET_ENQUEUED', {
        template: 'auth.password-reset',
        recipient: dto.email,
        notificationId: record.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return record;
    } catch (error) {
      this.logAuditFailure(
        'AUTH_PASSWORD_RESET_FAILED',
        { template: 'auth.password-reset', recipient: dto.email, ip: meta.ip, userAgent: meta.userAgent },
        error,
      );
      throw error;
    }
  }

  @Post('password-changed')
  @ApiBody({ type: PasswordChangedEmailDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  async sendPasswordChanged(
    @Body() dto: PasswordChangedEmailDto,
    @Req() req: Request,
  ): Promise<NotificationRecord> {
    const meta = this.extractRequestMeta(req);
    try {
      const record = await this.notificationsService.enqueue({
        channel: 'email',
        recipient: dto.email,
        subject: 'Password changed',
        body: `Password change confirmation queued for ${dto.email}`,
        metadata: {
          template: 'auth.password-changed',
          data: {
            name: dto.name,
            changedAt: dto.changedAt,
            supportUrl: dto.supportUrl,
            loginActivityUrl: dto.loginActivityUrl,
          },
        },
      });
      this.logAudit('AUTH_PASSWORD_CHANGED_ENQUEUED', {
        template: 'auth.password-changed',
        recipient: dto.email,
        notificationId: record.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return record;
    } catch (error) {
      this.logAuditFailure(
        'AUTH_PASSWORD_CHANGED_FAILED',
        { template: 'auth.password-changed', recipient: dto.email, ip: meta.ip, userAgent: meta.userAgent },
        error,
      );
      throw error;
    }
  }
}
