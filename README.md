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

---

## API Overview

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/notifications` | Return queued notifications (in-memory list) |
| `POST` | `/notifications` | Queue a new notification payload |

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
    notifications.controller.ts  # REST endpoints
    notifications.service.ts      # In-memory queue + future delivery hook
```

---

## Next Steps
1. Add validation (class-validator) for notification payloads.
2. Integrate a durable queue or database for persistence.
3. Implement delivery adapters (email, SMS, push) that consume the queued records.

---

## Contributing

1. Fork or branch from `main`.
2. Run `npm test` before pushing changes.
3. Open a Pull Request with a clear description of the change and testing notes.
