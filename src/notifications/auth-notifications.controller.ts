import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import type { NotificationRecord } from './notifications.service';
import { NotificationsService } from './notifications.service';
import { NotificationRecordDto } from './notifications.controller';

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
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('welcome')
  @ApiBody({ type: WelcomeEmailDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  async sendWelcome(@Body() dto: WelcomeEmailDto): Promise<NotificationRecord> {
    return this.notificationsService.enqueue({
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
  }

  @Post('verify-email')
  @ApiBody({ type: VerifyEmailDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  async sendVerification(@Body() dto: VerifyEmailDto): Promise<NotificationRecord> {
    return this.notificationsService.enqueue({
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
  }

  @Post('login-alert')
  @ApiBody({ type: LoginAlertEmailDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  async sendLoginAlert(@Body() dto: LoginAlertEmailDto): Promise<NotificationRecord> {
    return this.notificationsService.enqueue({
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
  }

  @Post('password-reset')
  @ApiBody({ type: PasswordResetEmailDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  async sendPasswordReset(@Body() dto: PasswordResetEmailDto): Promise<NotificationRecord> {
    return this.notificationsService.enqueue({
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
  }

  @Post('password-changed')
  @ApiBody({ type: PasswordChangedEmailDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  async sendPasswordChanged(@Body() dto: PasswordChangedEmailDto): Promise<NotificationRecord> {
    return this.notificationsService.enqueue({
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
  }
}
