# Events in the main backend

Events provide free wellness registration through /api/events in the existing Express server, shared MONGO_URI connection, and existing events and enrollments collections. No seed, migration, automatic index creation, collection replacement, or database creation runs at startup.

## Run

Run npm start in backend/ and npm run dev in frontend/. Set frontend VITE_API_URL to the existing backend URL. Keep the existing backend environment and JWT_SECRET. No gateway credentials or external checkout scripts are needed.

## Existing data and registration

The adapter reads existing ObjectIds, host.name, meetingUrl, sampleContent, In-person format, and structured agendas without rewriting records. All events are presented as free; legacy amount fields are ignored and preserved in storage. Legacy billing fields are neither returned nor written. Existing pending enrollments remain incomplete until the owner explicitly registers again, subject to capacity, or cancels. They do not reserve seats or expose meeting links. Confirmed enrollments remain confirmed.

Only explicit registration and cancellation update enrollment state and the event enrolledCount/version. Existing references, ObjectIds, creation dates, and unrelated fields are preserved through targeted updates. Repeated registration/cancellation requests reuse the same enrollment. An event document write serializes capacity checks inside MongoDB transactions across backend instances; the current event and enrollment are rechecked inside the transaction. Existing unique indexes remain unchanged. Production requires a transaction-capable MongoDB deployment such as the existing Atlas cluster.

Public responses hide meeting links; authenticated confirmed owners can access online links until the event ends. Authentication uses the existing JWT middleware and checks for a user identity. Origin checks and request limits remain in place.

## API

- GET /api/events: search, category, format, date filters, chronological sorting (upcoming or latest), and pagination.
- GET /api/events/:slugOrId: public event details.
- GET /api/events/mine: authenticated, read-only enrollment history.
- POST /api/events/:id/enroll: immediate, idempotent free registration.
- POST /api/events/:id/cancel: cancellation that releases the seat.

Calendar export, sharing, My Events, and dashboard event summaries remain available. Price filters and price sorting have been removed because all registrations are free.

## Verification

Run npm run test:events from backend/. Tests exercise the real Express router and store with an in-memory collection/session double. They never load Atlas credentials, connect to MongoDB, create databases, or delete records. Coverage includes authentication, duplicate registration, competing routers, capacity, cancellation/rebooking, filters, join-link access, legacy fields, and read-only history. The double models transaction serialization/rollback; it does not verify MongoDB server transaction behavior.

Run npm run build from frontend/ to check the production bundle. The optional node scripts/verifyEventsReadOnly.js command uses the existing main backend and Atlas connection for GET requests only, comparing before/after record fingerprints. It does not test writes against Atlas.
