# Events in the main backend

Events are mounted at /api/events in the existing Express server. They use the shared MONGO_URI connection and the existing events and enrollments collections. No seed, import, collection replacement, automatic index creation, or data migration runs at startup. Existing ObjectIds, references, and unrelated document fields are preserved.

## Run

Run npm start in backend/ and npm run dev in frontend/. Point frontend VITE_API_URL to the main backend (the checked-in example uses port 5000; backend fallback remains 5001). All frontend Events and Dashboard calls use that same API URL. Keep the existing backend .env and its secrets.

## Existing Atlas schema

Event records use ObjectId _id, published, host.name, meetingUrl, sampleContent, In-person format, and structured agenda entries. The adapter presents the existing frontend response format without rewriting source records. Public responses exclude meeting links. Published events appear in discovery; confirmed owners can access online links until the event ends.

Enrollments use user and event ObjectIds, gatewayOrderId, gatewayPaymentId, holdExpiresAt, enrolledAt, reference, status and paymentStatus. Existing unique indexes on user/event and reference are reused. New bookings update only booking state and the event's enrolledCount/version within transactions. Event document writes serialize capacity checks across backend instances. Paid holds last 15 minutes, and checkout creation has a short database lease to prevent concurrent order creation. Tests require a transaction-capable MongoDB deployment, including Atlas.

## API

- GET /api/events: search, category, format, price, date filters, sorting and pagination.
- GET /api/events/:slugOrId: public details.
- GET /api/events/mine: authenticated bookings and pending-payment reconciliation.
- POST /api/events/:id/enroll: idempotent enrollment or checkout.
- POST /api/events/:id/cancel: cancellation and refund request recording.
- POST /api/events/:id/verify-payment: signature, ownership, capture, amount and currency verification.

Authentication uses the main backend's existing JWT middleware and JWT_SECRET. Calendar export, sharing, dashboard summaries and booking UI retain their current response contracts.

## Payments

Optional RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET belong in backend/.env. Configure automatic capture at the provider. Without credentials, free bookings work and paid bookings are disabled. Refunds remain organizer-reviewed requests, not automatic payouts. My events reconciles pending payments; no new webhook or refund administration workflow is introduced.

## Verification

Run npm run test:events from backend/ (or node --test backend/test/events.test.js from the repository root). Tests use EVENTS_TEST_MONGO_URI when set, otherwise MONGO_URI, but always override the database name with a randomly named therapify_events_test_ database. They create fixtures only there and remove that test database afterward. The account needs permission to create and drop isolated test databases. Tests never seed or update the configured application database.

Run node --test test/*.test.js from backend/ for all backend tests. Run node scripts/verifyEventsReadOnly.js there to start a temporary main server on port 5187 and inspect real Events records using read-only requests. It compares record fingerprints and skips accounts with pending payments to avoid reconciliation writes.

Verified on 20 October 2026: 41 backend tests passed, including 16 Events tests using isolated Atlas databases. Main-backend checks passed for 8 existing events and 2 existing enrollments, with matching before/after fingerprints. Frontend production build passed with a bundle-size warning. No real Razorpay checkout or browser interaction test was performed; payment-provider responses were simulated and credentials were absent.
