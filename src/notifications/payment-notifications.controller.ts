import { Body, Controller, Logger, Post, Req } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationRecordDto } from './notifications.controller';
import type { NotificationRecord } from './notifications.service';
import { NotificationsService } from './notifications.service';

class PaymentLinkCreatedEmailDto {
  @ApiProperty({ description: 'Recipient email address' })
  email!: string;

  @ApiProperty({ required: false, description: 'Customer name' })
  customerName?: string;

  @ApiProperty({ description: 'Public define! payment link' })
  paymentUrl!: string;

  @ApiProperty({ description: 'Service or booking name' })
  serviceName!: string;

  @ApiProperty({ description: 'Service provider name' })
  providerName!: string;

  @ApiProperty({ example: 'ZAR' })
  currency!: string;

  @ApiProperty({ example: 8500 })
  amount!: number | string;

  @ApiProperty({
    required: false,
    description: 'Payment reference shown to the customer',
  })
  paymentReference?: string;
}

class ProviderBookingRequestEmailDto {
  @ApiProperty({ description: 'Service provider email address' })
  email!: string;

  @ApiProperty({ required: false, description: 'Service provider name' })
  providerName?: string;

  @ApiProperty({ description: 'Service or booking name' })
  serviceName!: string;

  @ApiProperty({ description: 'Customer name' })
  customerName!: string;

  @ApiProperty({ example: 'ZAR' })
  currency!: string;

  @ApiProperty({ example: 8500 })
  amount!: number | string;

  @ApiProperty({ description: 'Payment or booking reference' })
  paymentReference!: string;
}

@ApiTags('payment-notifications')
@Controller('notifications/payments')
export class PaymentNotificationsController {
  private readonly logger = new Logger(PaymentNotificationsController.name);

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

  @Post('payment-link')
  @ApiBody({ type: PaymentLinkCreatedEmailDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  async sendPaymentLinkCreated(
    @Body() dto: PaymentLinkCreatedEmailDto,
    @Req() req: Request,
  ): Promise<NotificationRecord> {
    const meta = this.extractRequestMeta(req);
    const record = await this.notificationsService.enqueue({
      channel: 'email',
      recipient: dto.email,
      subject: 'Complete your define! payment',
      body: `Payment link queued for ${dto.email}`,
      metadata: {
        template: 'payment.payment-link-created',
        data: {
          customerName: dto.customerName,
          paymentUrl: dto.paymentUrl,
          serviceName: dto.serviceName,
          providerName: dto.providerName,
          currency: dto.currency,
          amount: dto.amount,
          paymentReference: dto.paymentReference,
        },
      },
    });

    this.logger.log({
      event: 'PAYMENT_LINK_EMAIL_ENQUEUED',
      template: 'payment.payment-link-created',
      recipient: dto.email,
      notificationId: record.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return record;
  }

  @Post('provider-booking-request')
  @ApiBody({ type: ProviderBookingRequestEmailDto })
  @ApiCreatedResponse({ type: NotificationRecordDto })
  async sendProviderBookingRequest(
    @Body() dto: ProviderBookingRequestEmailDto,
    @Req() req: Request,
  ): Promise<NotificationRecord> {
    const meta = this.extractRequestMeta(req);
    const record = await this.notificationsService.enqueue({
      channel: 'email',
      recipient: dto.email,
      subject: 'New Booking Request | define!.',
      body: `Provider booking request queued for ${dto.email}`,
      metadata: {
        template: 'payment.provider-booking-request',
        data: {
          providerName: dto.providerName,
          serviceName: dto.serviceName,
          customerName: dto.customerName,
          currency: dto.currency,
          amount: dto.amount,
          paymentReference: dto.paymentReference,
        },
      },
    });

    this.logger.log({
      event: 'PROVIDER_BOOKING_REQUEST_EMAIL_ENQUEUED',
      template: 'payment.provider-booking-request',
      recipient: dto.email,
      notificationId: record.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return record;
  }
}
