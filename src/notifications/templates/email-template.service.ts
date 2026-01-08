import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Handlebars, { TemplateDelegate } from 'handlebars';
import type { NotificationMetadata } from '../interfaces/notification-metadata.interface';
import type { NotificationTemplate } from '../types/notification-template.type';

type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

type TemplateDefinitionBase<TData> = {
  subject: (data: TData) => string;
  previewText: (data: TData) => string;
  bodyTemplate: TemplateDelegate<TData & Record<string, unknown>>;
  footerTemplate?: TemplateDelegate<TData & Record<string, unknown>>;
  textTemplate: TemplateDelegate<TData & Record<string, unknown>>;
  prepareContext?: (data: TData) => Record<string, unknown>;
  fullDocument?: boolean;
};

type TemplateDefinition<T extends NotificationTemplate> = TemplateDefinitionBase<
  NotificationMetadata<T>['data']
>;

type TemplateDefinitionMap = {
  [K in NotificationTemplate]: TemplateDefinition<K>;
};

type LayoutContext = {
  subject: string;
  previewText: string;
  body: string;
  footer: string;
};

@Injectable()
export class EmailTemplateService {
  private readonly layoutTemplate: TemplateDelegate<LayoutContext>;
  private readonly defaultFooterTemplate: TemplateDelegate<Record<string, unknown>>;
  private readonly templates: TemplateDefinitionMap;
  private readonly genericTemplate: TemplateDefinitionBase<Record<string, never>>;

  constructor() {
    this.layoutTemplate = Handlebars.compile(LAYOUT_TEMPLATE.trim());
    this.defaultFooterTemplate = Handlebars.compile(DEFAULT_FOOTER_TEMPLATE.trim());

    this.genericTemplate = {
      subject: () => 'Define notification',
      previewText: () => 'You have a new notification.',
      bodyTemplate: Handlebars.compile(GENERIC_BODY_TEMPLATE.trim()),
      footerTemplate: undefined,
      textTemplate: Handlebars.compile(GENERIC_TEXT_TEMPLATE.trim()),
    };

    this.templates = {
      'auth.welcome': {
        subject: (data) => (data.name ? `Welcome to Define, ${data.name}!` : 'Welcome to Define!'),
        previewText: () => 'Finish setting up your Define workspace in a few clicks.',
        bodyTemplate: this.compileFile('welcome.hbs'),
        textTemplate: Handlebars.compile(WELCOME_TEXT_TEMPLATE.trim()),
        prepareContext: (data) => ({
          verificationUrl: data.verificationUrl ?? data.dashboardUrl,
        }),
        fullDocument: true,
      },
      'auth.verify-email': {
        subject: () => 'Verify your email for Define',
        previewText: () => 'Confirm your email to secure your Define workspace.',
        bodyTemplate: this.compileFile('verify-email.hbs'),
        textTemplate: Handlebars.compile(VERIFY_TEXT_TEMPLATE.trim()),
        prepareContext: (data) => ({
          greeting: data.name ? `Hi ${data.name},` : 'Hi there,',
          helpLabel: data.helpUrl ?? 'support@define.local',
          helpHref: data.helpUrl ?? 'mailto:support@define.local',
        }),
        fullDocument: true,
      },
      'auth.login-alert': {
        subject: () => 'New sign-in to your Define account',
        previewText: () => 'We spotted a fresh login and wanted to double check it was you.',
        bodyTemplate: this.compileFile('login-new-device.hbs'),
        textTemplate: Handlebars.compile(LOGIN_ALERT_TEXT_TEMPLATE.trim()),
        prepareContext: (data) => ({
          greeting: data.name ? `Hi ${data.name},` : 'Hi there,',
          rows: [
            { label: 'Location', value: data.location ?? 'Unknown location' },
            { label: 'IP Address', value: data.ipAddress ?? 'Unavailable' },
            { label: 'Device', value: data.device ?? 'Unknown device' },
            { label: 'Signed in at', value: this.formatDate(data.loginAt) },
          ],
        }),
        fullDocument: true,
      },
      'auth.password-reset': {
        subject: () => 'Reset your Define password',
        previewText: () => 'Use this secure link to create a new password.',
        bodyTemplate: this.compileFile('password-reset.hbs'),
        textTemplate: Handlebars.compile(PASSWORD_RESET_TEXT_TEMPLATE.trim()),
        prepareContext: (data) => ({
          greeting: data.name ? `Hi ${data.name},` : 'Hi there,',
          expires: data.expiresInMinutes ?? 15,
          supportHref: data.supportUrl ?? 'mailto:support@define.local',
          supportLabel: data.supportUrl ?? 'support@define.local',
        }),
        fullDocument: true,
      },
      'auth.password-changed': {
        subject: (data) =>
          data.name ? `Password updated, ${data.name}` : 'Your Define password was updated',
        previewText: () => 'Here’s a quick confirmation of your recent password change.',
        bodyTemplate: this.compileFile('password-changed.hbs'),
        textTemplate: Handlebars.compile(PASSWORD_CHANGED_TEXT_TEMPLATE.trim()),
        prepareContext: (data) => ({
          greeting: data.name ? `Hi ${data.name},` : 'Hi there,',
          changedAt: this.formatDate(data.changedAt),
          supportHref: data.supportUrl ?? 'mailto:support@define.local',
          supportLabel: data.supportUrl ?? 'support@define.local',
          activityUrl: data.loginActivityUrl,
        }),
        fullDocument: true,
      },
    } as TemplateDefinitionMap;
  }

  async render(metadata: NotificationMetadata): Promise<EmailContent> {
    const definition = this.templates[metadata.template];

    if (definition) {
      return this.compileTemplate(definition, metadata.data);
    }

    return this.compileTemplate(this.genericTemplate, {} as Record<string, never>);
  }

  private compileTemplate<TData>(
    definition: TemplateDefinitionBase<TData>,
    data: TData,
  ): EmailContent {
    const subject = definition.subject(data);
    const previewText = definition.previewText(data);
    const context = this.buildContext(definition, data);
    const text = this.renderText(definition.textTemplate, context);

    let html: string;

    if (definition.fullDocument) {
      html = definition.bodyTemplate(context);
    } else {
      const body = definition.bodyTemplate(context);
      const footer = (definition.footerTemplate ?? this.defaultFooterTemplate)(context);
      html = this.layoutTemplate({ subject, previewText, body, footer });
    }

    return { subject, html, text };
  }

  private buildContext<TData>(
    definition: TemplateDefinitionBase<TData>,
    data: TData,
  ): TData & Record<string, unknown> {
    if (!definition.prepareContext) {
      return data as TData & Record<string, unknown>;
    }

    return {
      ...data,
      ...definition.prepareContext(data),
    } as TData & Record<string, unknown>;
  }

  private compileFile<TContext extends Record<string, unknown>>(
    fileName: string,
  ): TemplateDelegate<TContext> {
    const filePath = join(__dirname, fileName);
    const contents = readFileSync(filePath, 'utf8');
    return Handlebars.compile<TContext>(contents);
  }

  private renderText(
    template: TemplateDelegate<Record<string, unknown>>,
    context: Record<string, unknown>,
  ): string {
    const raw = template(context) ?? '';
    const normalized = raw
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line, index, arr) => line.length > 0 || (index > 0 && arr[index - 1].length > 0));

    return normalized.join('\n').trim();
  }

  private formatDate(input?: string): string {
    try {
      const date = input ? new Date(input) : new Date();
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return input ?? 'Unknown time';
    }
  }
}

const LAYOUT_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{subject}}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f3f4f6;
        font-family: 'Inter', 'system-ui', sans-serif;
        color: #111827;
      }
      .wrapper {
        width: 100%;
        padding: 20px;
      }
      .container {
        max-width: 640px;
        margin: 24px auto;
        background-color: #ffffff;
        border-radius: 32px;
        padding: 40px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 10px 40px rgba(15, 23, 42, 0.05);
      }
      .pill {
        text-transform: uppercase;
        letter-spacing: 0.4em;
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
        margin-bottom: 24px;
      }
      .button {
        display: inline-block;
        padding: 12px 32px;
        background-color: #111827;
        color: #ffffff;
        text-decoration: none;
        border-radius: 999px;
        font-weight: 600;
      }
      p {
        font-size: 16px;
        line-height: 26px;
        color: #4b5563;
        margin: 0 0 16px;
      }
    </style>
  </head>
  <body>
    <div style="display: none; opacity: 0; color: transparent; height: 0;">
      {{previewText}}
    </div>
    <div class="wrapper">
      <div class="container">
        <div class="pill">define.</div>
        {{{body}}}
        <div style="border-top: 1px solid #f3f4f6; margin-top: 32px; padding-top: 24px;">
          {{{footer}}}
        </div>
      </div>
    </div>
  </body>
</html>
`;

const DEFAULT_FOOTER_TEMPLATE = `
<p style="font-size: 12px; color: #9ca3af; margin: 0 0 8px;">
  You’re receiving this email because you recently interacted with Define.
</p>
<p style="font-size: 12px; color: #9ca3af; margin: 0;">
  Need help? <a href="mailto:support@define.local" style="color: #111827;">Contact support</a>.
</p>
`;

const WELCOME_TEXT_TEMPLATE = `
{{#if name}}
Hey {{name}},
{{else}}
Hey there,
{{/if}}
Thanks for joining define! so early. We built it so creators can get paid with systems that respect their time and money.
{{#if verificationUrl}}
Verify your email to unlock the dashboard: {{verificationUrl}}
{{/if}}
Inside you’ll find a focused dashboard, secure escrow, a ready-to-share booking link, and workflows that keep you organized.
This is just the foundation—more is coming with the same creator-first mindset.
If this wasn’t you, ignore the email or contact support@define.local.
`;

const VERIFY_TEXT_TEMPLATE = `
{{greeting}}
Confirm your email to secure your Define workspace: {{verificationUrl}}
Need help? {{helpLabel}}
`;

const LOGIN_ALERT_TEXT_TEMPLATE = `
{{greeting}}
We saw a new sign-in to your Define workspace.
{{#each rows}}
{{this.label}}: {{this.value}}
{{/each}}
Not you? Reset your password immediately.
`;

const PASSWORD_RESET_TEXT_TEMPLATE = `
{{greeting}}
Reset your password using this link (expires in {{expires}} minutes): {{resetUrl}}
Need help? {{supportLabel}}
`;

const PASSWORD_CHANGED_TEXT_TEMPLATE = `
{{greeting}}
Your password was just updated{{#if changedAt}} on {{changedAt}}{{/if}}.
If this was you, no action is needed.
If you didn’t make this change, secure your account immediately{{#if activityUrl}}: {{activityUrl}}{{/if}}.
Need help? {{supportLabel}}
`;

const GENERIC_BODY_TEMPLATE = `
<h1 style="font-size: 32px; line-height: 40px; margin: 0 0 16px; color: #111827;">
  Notification
</h1>
<p>This is a generic notification from the Define platform.</p>
`;

const GENERIC_TEXT_TEMPLATE = `
Notification
This is a generic notification from the Define platform.
`;

export type { EmailContent };
