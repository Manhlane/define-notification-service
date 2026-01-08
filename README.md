# Define Notification Service

Lightweight NestJS service that will eventually handle all notification delivery for the Define platform.  
Right now it exposes a simple in-memory queue and REST endpoints so future delivery logic (email, SMS, push, etc.) has a clean entry point.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install dependencies
```bash
npm install
```

### Run the development server
```bash
npm run start:dev
```
The service boots on `http://localhost:3005` by default.

### Open interactive docs (Swagger UI)
After the server is running, visit:
```
http://localhost:3005/docs
```
You can send live requests to the API and inspect schemas from the browser.

### Run the test suite
```bash
npm test
```

---

## Configuration

| Environment Variable | Default | Notes |
| -------------------- | ------- | ----- |
| `PORT` | `3005` | HTTP port for the NestJS app |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Comma-separated list of origins allowed for CORS |
| `RABBITMQ_URL` | `amqp://localhost:5672` | One or more RabbitMQ connection strings (comma separated) |
| `RABBITMQ_NOTIFICATIONS_QUEUE` | `notifications` | Queue used for published notification jobs |
| `MAILGUN_API_KEY` | — | Required to send authentication emails |
| `MAILGUN_DOMAIN` | — | Mailgun domain that owns the sending IPs |
| `MAILGUN_FROM_EMAIL` | — | Display name / address surfaced in Define emails |
| `MAILGUN_BASE_URL` | `https://api.mailgun.net` | Optional override (use the EU URL for EU domains) |

Update the provided `.env` file (or export the same variables) before booting the service so the RabbitMQ connection includes the right credentials.

---

## API Overview

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/notifications` | Return queued notifications (in-memory list) |
| `POST` | `/notifications` | Queue a generic notification payload |
| `POST` | `/notifications/auth/welcome` | Send the Tailwind welcome email after sign-up |
| `POST` | `/notifications/auth/verify-email` | Resend verification email with a CTA link |
| `POST` | `/notifications/auth/login-alert` | Send a login alert that mirrors the UI styling |
| `POST` | `/notifications/auth/password-reset` | Deliver password reset links with Define-styled templates |

### POST `/notifications` payload
```json
{
  "channel": "email",
  "recipient": "user@example.com",
  "subject": "Welcome",
  "body": "Thanks for signing up!",
  "metadata": { "category": "onboarding" }
}
```

---

## Project Structure

```
src/
  app.module.ts              # Application root that wires the notification module
  notifications/
    notifications.controller.ts          # Generic REST endpoints
    auth-notifications.controller.ts     # Auth-specific email routes that the UI calls
    notifications.service.ts             # In-memory queue + publish + status tracking
    notifications.consumer.ts            # RabbitMQ consumer that renders + sends emails
    templates/email-template.service.ts  # Tailwind-powered email templates
    mailgun.service.ts                   # Mailgun client wrapper
    rabbitmq.provider.ts                 # RabbitMQ client factory and connection options
```

---

## RabbitMQ integration

The service bootstraps a reusable RabbitMQ client (`notifications/rabbitmq.provider.ts`) so every queued notification is immediately emitted to the `notifications.enqueue` event stream while a connected Nest microservice consumer (`notifications/notifications.consumer.ts`) acknowledges the queue message and updates the in-memory status.

- Configure the broker with `RABBITMQ_URL` and `RABBITMQ_NOTIFICATIONS_QUEUE`.
- Each call to `POST /notifications` stores the payload in-memory and emits it via `ClientProxy.emit`, allowing the built-in consumer (or other workers) to process the job.
- The consumer acknowledges messages explicitly so they are removed from the queue only after processing succeeds; failures to publish are logged but do not block the HTTP response.

Example Docker Compose snippet:
```yaml
rabbitmq:
  image: rabbitmq:3-management
  ports:
    - "5672:5672"
    - "15672:15672"
```

## Mailgun email delivery

Authentication flows (sign up, login alerts, password reset, and verify email) are routed through Mailgun with templates that mirror the Define UI (Tailwind styles, rounded cards, bold headings, etc.).

- Configure `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `MAILGUN_FROM_EMAIL`.
- Optional: set `MAILGUN_BASE_URL=https://api.eu.mailgun.net` when using an EU domain.
- Each REST call queues an email job; the RabbitMQ consumer renders the Handlebars template and asks Mailgun to deliver it.
- If the service boots without credentials it logs a warning and marks the affected jobs as failed so you can requeue them later.

---

## Next Steps
1. Add validation (class-validator) for notification payloads.
2. Replace the in-memory store with durable persistence or rely solely on RabbitMQ streams.
3. Swap out the placeholder consumer logic for real email/push delivery adapters (or move it to a dedicated worker service).

---

## Contributing

1. Fork or branch from `main`.
2. Run `npm test` before pushing changes.
3. Open a Pull Request with a clear description of the change and testing notes.
