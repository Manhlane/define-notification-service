import { Injectable, Logger } from '@nestjs/common';
import Mailgun from 'mailgun.js';
import FormData = require('form-data');

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

type MailgunClient = ReturnType<Mailgun['client']>;

@Injectable()
export class MailgunService {
  private readonly logger = new Logger(MailgunService.name);
  private readonly client?: MailgunClient;
  private readonly domain?: string;
  private readonly fromAddress?: string;
  private readonly enabled: boolean;

  constructor() {
    const apiKey = process.env.MAILGUN_API_KEY;
    this.domain = process.env.MAILGUN_DOMAIN;
    this.fromAddress = process.env.MAILGUN_FROM_EMAIL;
    const baseUrl = process.env.MAILGUN_BASE_URL;

    if (!apiKey || !this.domain || !this.fromAddress) {
      this.logger.warn(
        'Mailgun credentials are missing (MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM_EMAIL). Email delivery disabled.',
      );
      this.enabled = false;
      return;
    }

    const mailgun = new Mailgun(FormData);
    this.client = mailgun.client({
      username: 'api',
      key: apiKey,
      url: baseUrl,
    });
    this.enabled = true;
  }

  isEnabled(): boolean {
    return Boolean(this.enabled && this.client && this.domain && this.fromAddress);
  }

  async sendEmail(options: SendEmailOptions): Promise<string | null> {

    this.logger.debug(`Mailgun env status`, {
      apiKey: process.env.MAILGUN_API_KEY,
      domain: this.domain,
      from: this.fromAddress,
    });
    if (!this.isEnabled() || !this.client || !this.domain) {
      this.logger.warn(`Mailgun disabled. Skipping email to ${options.to}.`);
      return null;
    }


    try {
      const response = await this.client.messages.create(this.domain, {
        from: options.from ?? this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Email sent to ${options.to} (${response.id ?? response.message}).`);
      return response.id ?? null;
    } catch (error) {
      const detail = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`Failed to send email to ${options.to}: ${detail}`);
      throw error;
    }
  }
}
