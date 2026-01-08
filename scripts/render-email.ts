import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EmailTemplateService } from '../src/notifications/templates/email-template.service';
import type { NotificationMetadata } from '../src/notifications/interfaces/notification-metadata.interface';
import type { NotificationTemplate } from '../src/notifications/types/notification-template.type';

type PreviewConfig = {
  metadata: NotificationMetadata;
  fileName: string;
};

const PREVIEWS: Record<NotificationTemplate, PreviewConfig> = {
  'auth.welcome': {
    metadata: {
      template: 'auth.welcome',
      data: {
        name: 'Ava',
        verificationUrl: 'https://define.local/auth/verify?token=example-token',
        dashboardUrl: 'https://define.local/dashboard',
      },
    },
    fileName: 'welcome-preview.html',
  },
  'auth.verify-email': {
    metadata: {
      template: 'auth.verify-email',
      data: {
        name: 'Ava',
        verificationUrl: 'https://define.local/auth/verify?token=example-token',
        helpUrl: 'mailto:support@define.local',
      },
    },
    fileName: 'verify-email-preview.html',
  },
  'auth.password-reset': {
    metadata: {
      template: 'auth.password-reset',
      data: {
        name: 'Ava',
        resetUrl: 'https://define.local/reset-password?token=example-token',
        expiresInMinutes: 30,
      },
    },
    fileName: 'password-reset-preview.html',
  },
  'auth.login-alert': {
    metadata: {
      template: 'auth.login-alert',
      data: {
        name: 'Ava',
        location: 'Johannesburg, South Africa',
        ipAddress: '41.13.112.8',
        device: 'Safari on macOS',
        loginAt: new Date().toISOString(),
      },
    },
    fileName: 'login-new-device-preview.html',
  },
  'auth.password-changed': {
    metadata: {
      template: 'auth.password-changed',
      data: {
        name: 'Ava',
        changedAt: new Date().toISOString(),
        supportUrl: 'mailto:support@define.local',
        loginActivityUrl: 'https://define.local/security',
      },
    },
    fileName: 'password-changed-preview.html',
  },
};

async function render(target?: NotificationTemplate | 'all'): Promise<void> {
  const service = new EmailTemplateService();
  const entries = Object.entries(PREVIEWS) as [NotificationTemplate, PreviewConfig][];
  const targets =
    target && target !== 'all'
      ? entries.filter(([template]) => template === target)
      : entries;

  if (targets.length === 0) {
    throw new Error(`Unknown template "${target}". Available: ${Object.keys(PREVIEWS).join(', ')}`);
  }

  const outDir = join(process.cwd(), 'preview');
  mkdirSync(outDir, { recursive: true });

  for (const [, config] of targets) {
    const rendered = await service.render(config.metadata);
    const filePath = join(outDir, config.fileName);
    writeFileSync(filePath, rendered.html, 'utf8');
    // eslint-disable-next-line no-console
    console.log(`Preview written to ${filePath}`);
  }
}

const [, , templateArg] = process.argv;

render(templateArg as NotificationTemplate | 'all' | undefined).catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to render email preview', error);
  process.exit(1);
});
