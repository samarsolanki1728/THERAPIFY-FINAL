# Dashboard and events integration

The existing `backend/` is unchanged. Dashboard reads its existing authenticated mood and journal APIs. Events use this independent service and a separate SQLite file; no MongoDB collections or existing backend routes are modified.

## Run locally

Requires Node.js 22.13+ (tested with Node 24). There are no packages to install for this service.

In `events-backend/`:

```powershell
npm.cmd run seed:demo
npm.cmd start
```

The service listens on `http://localhost:5002`. Startup reads the existing backend `.env` for `JWT_SECRET` and then optional `events-backend/.env` overrides. It never modifies either file. `EVENTS_PORT` is separate from the existing backend's `PORT`. Do not set a different JWT secret: users should sign in once through the original application.

Keep the existing backend running normally. In `frontend/`, run `npm.cmd run dev`. Set `VITE_EVENTS_API_URL` if the events service is hosted elsewhere. Set `VITE_API_URL` to the actual existing backend URL (frontend default 5000; existing server fallback 5001). See `frontend/.env.example`. Restart Vite after environment changes.

The homepage links to `/dashboard`; Events is in the navigation at `/events`. Authentication redirects return users to Dashboard or the selected event after sign-in. Dashboard journal links open a new editor or the selected entry.

## Data and event publishing

The seed command adds six **clearly labelled free demo events**, scheduled relative to the day it is run. They are examples, not real sessions. Repeating the command preserves existing events and enrollments. The server does not automatically fabricate events when the catalog is empty.

SQLite lives in `data/events.sqlite` (ignored by Git). `EVENTS_DB_PATH` can change the location. Preserve the database, WAL and SHM files appropriately when backing up a running service, or stop the service before copying. This is a local/single-instance service; use shared database infrastructure before horizontal scaling.

To publish real events, create a JSON array and run:

```powershell
npm.cmd run import:catalog -- C:/path/to/events.json
```

Each event needs `_id`, `slug`, `title`, `shortDescription`, `description`, `host`, `venue`, `category`, `format` (`Online` or `In person`), `startsAt` and `endsAt` (ISO dates with timezone), integer `pricePaise`, and positive integer `capacity`. Optional fields: `agenda` (array of strings), `joinUrl` (HTTPS), and `isDemo`. Supported categories are exported in `store.js`. Set `isDemo: false` for real listings. Imports refuse to overwrite an event that already has enrollments. No public event-editing endpoint is exposed.

## Endpoints

- `GET /` — health.
- `GET /api/events` — public listing with `q`, `category`, `format`, `sort`, `page`, `limit`.
- `GET /api/events/:slugOrId` — public details; excludes join URL.
- `GET /api/events/mine` — authenticated enrollments; reconciles pending payments when configured.
- `POST /api/events/:id/enroll` — authenticated free enrollment or paid checkout.
- `POST /api/events/:id/cancel` — cancel before start; paid cancellations record refund requests.
- `POST /api/events/:id/verify-payment` — verify checkout ownership, signature, capture, amount and currency.

Free enrollments are idempotent. SQLite transactions protect capacity and a unique user/event key prevents duplicates. Pending paid seats are held for 15 minutes. Join URLs appear only in the owning user's confirmed enrollment. The UI includes filtering, details, enrollment confirmation, My events, cancellation, calendar export, link copying and joining configured online sessions.

## Optional Razorpay payments

Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the events service environment and configure automatic capture in Razorpay. Without them, paid booking is disabled and free events work. Use test-mode credentials before live credentials. No real payment was made during implementation.

The server creates orders and verifies the signature against its stored order ID, then checks captured status, currency and amount. My events reconciles missed checkout callbacks through the provider's order-payment API. A late payment that cannot secure a place records a refund request, never an extra confirmed seat.

**Refund requests are records, not automatic refunds.** The organizer must review them and issue refunds through Razorpay; there is no admin/refund-processing UI in this change. Pending payments rely on My events refresh rather than a webhook/background worker. Configure webhooks or scheduled reconciliation and an organizer refund workflow before operating paid events at scale.

Provider reference: [Razorpay payment integration](https://razorpay.com/docs/payments/payment-gateway/quick-integration/build-integration/).

## Verification

```powershell
npm.cmd test
```

Tests use isolated in-memory/temporary databases and fake payment adapters; they never touch the existing MongoDB or live Razorpay account. Coverage includes authentication, user isolation, capacity races, idempotency, cancellation, persistence, payment validation, reconciliation, and late-payment handling. Build the frontend separately with `npm.cmd run build` in `frontend/`.
