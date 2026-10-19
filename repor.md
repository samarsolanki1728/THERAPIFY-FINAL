# Therapify — Project Analysis and Feature Inventory

Reviewed: 19 October 2026

## Implementation update: encrypted chat storage

- Chat message text, conversation titles, and stored recommendation titles/reasons/URLs now use server-side AES-256-GCM encryption before MongoDB writes.
- A random server-only `CHAT_ENCRYPTION_KEY` was generated in the Git-ignored backend environment; it must be preserved and backed up securely.
- All 10 existing Atlas conversations were migrated. Verification reported zero remaining plaintext conversations, zero conflicts, and zero unreadable records.
- Mongoose getters decrypt authenticated API responses and consented AI context. Database metadata such as ownership, timestamps and message roles remains readable.
- Eight encryption tests passed. A live isolated probe passed create, rename, append, list/history, user-isolation and deletion checks, and removed its temporary records without calling Gemini.
- This is encryption of chat content at rest, not end-to-end encryption. Journals and moods are not encrypted by this change, and historical Atlas backups can retain pre-migration plaintext.
- Homepage/footer/privacy text was updated to describe the protection accurately. See [backend/CHAT_ENCRYPTION.md](backend/CHAT_ENCRYPTION.md) for key management, migration commands and limitations.

## Implementation update: Dashboard and events

The inventory below describes the earlier analysis snapshot. Since that review, the following features have been added:

- `/dashboard`: daily mood check-in, seven-day chart, recent journal links, wellness suggestions, and enrolled events, based on the supplied dashboard design.
- `/events`: event discovery, search/category/format filters, sorting/pagination, details, enrollment, My events, cancellation, calendar export, share links, and configured online-session links.
- Events is in desktop/mobile navigation. The homepage's Go to Dashboard button opens `/dashboard`; Dashboard is not added to navigation.
- Sign-in returns users to the requested dashboard/events page. Journal links support opening a new editor or a specific entry.
- A separate `events-backend/` service runs on port 5002, with its own SQLite persistence and existing-token verification. Existing `backend/` files were not changed by this integration.
- Six clearly labelled demo listings were seeded locally. Real events can be imported through the separate service's catalog command.
- Optional Razorpay checkout includes server-side verification and reconciliation. Live payments were not tested; refunds are recorded requests for organizer processing, not automatic refunds.
- Validation: frontend production build passed; eight isolated backend tests passed; original API on port 5000 and new events API on port 5002 responded successfully. Browser interaction testing was not performed.

Setup, API details and limitations: [events-backend/README.md](events-backend/README.md).

## 1. Scope and current status

Therapify is a mental wellness web application with a React frontend, an Express API, MongoDB persistence, and Google Gemini integration. The main implemented product areas are accounts, a personalized home dashboard, emotional-support chat, mood tracking, age-adapted check-ins, private journals, and wellness activities.

This report describes the **current working directory**, including existing modified and untracked files. Those changes are part of this inventory even if they have not been committed. Application source files were reviewed across the frontend, backend, and shared directory, together with manifests, routing, configuration, styles, and existing documentation. Installed dependencies, generated build files, and Git internals were treated as supporting directories rather than application source. Secret environment values were not read or copied.

“Implemented” below means code and relevant wiring exist. It does not mean the feature has passed a live database, browser, or Gemini integration test. No application logic was changed during this review.

## 2. Directory and technology map

```text
git-therapify/
├── backend/
│   ├── config/db.js             MongoDB connection
│   ├── middleware/              JWT authentication
│   ├── models/                  Six Mongoose data models
│   ├── routes/                  Seven API route modules
│   ├── services/                AI, safety, context, recommendations, cache
│   ├── server.js                Express setup and API mounting
│   ├── package.json             Backend dependencies and scripts
│   └── .env                     Local configuration; values excluded here
├── frontend/
│   ├── src/app/                 Router, layout, reusable components
│   ├── src/pages/               Product and informational pages
│   ├── src/styles/              Fonts, theme, Tailwind and other CSS
│   ├── src/imports/pasted_text/ Design roadmap
│   ├── dist/                    Generated frontend build
│   ├── vite.config.js           Build plugins, alias, Figma asset resolver
│   └── package.json             Frontend dependencies and scripts
├── shared/wellnessCatalog.json  Backend wellness activity catalog
├── README.md                   Short project introduction
├── package-lock.json           Root lockfile; no root package.json found
└── icacls                      Untracked root file; purpose unclear
```

| Layer | Existing implementation |
| --- | --- |
| Frontend | React 18, React Router 7, Vite 6, JavaScript/JSX |
| UI | Tailwind CSS 4, Lucide icons, Recharts, Motion, Radix/shadcn-style component library |
| Backend | Node.js, Express 5, CommonJS modules |
| Database | MongoDB through Mongoose 9 |
| Authentication | bcrypt password hashing and JSON Web Tokens |
| AI | Google GenAI SDK; configurable Gemini model |
| Supporting services | In-memory TTL cache, chat request limiter, regex safety and scope filters |
| Design origin | Figma Make export, attribution file, design roadmap, Google Fonts and Unsplash assets |

Some installed UI packages and reusable components are scaffolding; their presence does not mean a corresponding product feature exists.

## 3. Features already implemented

### 3.1 Registration, sign-in and navigation

- Registration collects name, email and password and creates a MongoDB user with a hashed password.
- Registration also presents wellness goal choices. These selections stay in frontend state and are **not submitted or persisted**.
- Sign-in verifies credentials and issues a JWT valid for seven days.
- The frontend stores the token and basic user details in `localStorage`.
- Protected API requests use `Authorization: Bearer <token>`.
- The navigation displays the saved user's name and offers logout. Desktop logout clears local storage and redirects home.
- The backend exposes a public registered-user count used by the home page.
- The user model includes `client`, `therapist`, and `admin` roles, plus phone and profile-picture fields. Dedicated role workflows and profile editing are not implemented.

Key files: `frontend/src/pages/Register.jsx`, `SignIn.jsx`, `frontend/src/app/Root.jsx`, `backend/routes/authRoutes.js`, `backend/middleware/authMiddleware.js`, `backend/models/User.js`.

### 3.2 Home and personal dashboard

- Landing content introduces features, the product flow, and testimonials.
- Signed-in visitors get their name, a time-based greeting, and today's date.
- A quick mood selector loads and saves the current day's mood through the backend.
- Weekly mood data, average mood, logging streak, comparison with the preceding week, and simple rule-based insight text are calculated from saved entries.
- Product links lead to chat, mood tracking, journals and wellness activities.
- The registered-user count comes from the API; marketing copy and testimonials are hardcoded content.

Key file: `frontend/src/pages/Home.jsx`.

### 3.3 AI emotional-support chat

- Signed-in users can send messages and receive Gemini-generated responses.
- Conversations and messages are persisted in MongoDB and scoped to the authenticated user.
- The interface can list, reopen, rename and delete conversations, and start a new chat.
- Conversation lists show titles, snippets and date grouping. Titles can be derived from the first user message.
- Messages have user/AI roles and timestamps; crisis and out-of-scope responses can be flagged.
- The frontend includes suggested prompts, loading states, a responsive conversation sidebar, and Markdown rendering for AI responses.
- The server supplies the user's saved name and the last eight messages from the active conversation as response context.
- An optional context toggle can include recent moods, completed questionnaires, other conversations, and journals with saved AI-analysis permission.
- Context collection uses a 30-day window with bounded record counts and text lengths, excludes synthetic records, and excludes the active conversation from cross-conversation context.
- Chat input is limited to 3,000 characters. A per-user limiter allows 60 message requests per 15 minutes.
- A mock response path is available through `AI_MODE=mock`.

This is bounded context retrieval, not a separate long-term semantic memory or vector-search system. Responses arrive as complete JSON responses; streaming is not implemented.

Key files: `frontend/src/pages/Chat.jsx`, `frontend/src/app/components/MarkdownRenderer.jsx`, `backend/routes/chatRoutes.js`, `backend/models/Conversation.js`, `backend/services/geminiService.js`, `moodContextService.js`.

### 3.4 Safety and topic boundaries

- A regex-based service detects selected expressions of self-harm or acute distress.
- Detected chat crises receive a prepared supportive response with emergency-resource text, and the exchange is saved.
- Topic filtering handles selected off-topic requests and recognizes a broad list of mental-health terms and conversational follow-ups.
- Gemini system instructions ask for empathetic support, limited follow-up questions, no diagnosis or prescribing, and optional catalog-based exercises.
- Journal analysis and personalized recommendations also invoke the safety service.
- A crisis resources page contains contact links and resource information.

These are implemented safeguards, not evidence of comprehensive crisis detection or clinical validation. External phone numbers, resource availability, and video links were not verified during this source review.

Key files: `backend/services/safetyService.js`, `scopeService.js`, `geminiService.js`, `frontend/src/pages/Crisis.jsx`.

### 3.5 Mood tracking and trends

- Users can log a mood from 1 to 5, with a label, emoji, emotion tags, optional note, and date string.
- Saving a mood updates an existing record for the same user/date when found.
- The API supports listing entries, retrieving by date, updating by ID, and deleting by ID.
- The mood page loads today's entry and supports saving changes and deleting today's entry.
- Weekly and monthly chart data, averages, logging streaks, and previous-week comparisons are derived in the frontend.
- Saved mood records also feed the dashboard and consented recommendation/chat context.

Key files: `frontend/src/pages/Mood.jsx`, `backend/routes/moodRoutes.js`, `backend/models/Mood.js`.

### 3.6 Adaptive mood check-in

- A questionnaire appears on the mood page after a mood entry exists.
- Supported age groups are **13–18, 19–21 and 22–25**.
- Each group has nine questions tailored around feelings, responsibilities, rest, energy, relationships, concerns, and support goals.
- Users must select an age group and consent before starting.
- Unfinished answers and the current step are saved and can be restored.
- Backend validation checks the mood entry's ownership, age group and permitted answers.
- Completion stores a reflection and up to three recommendations, with a unique user/mood-entry index.
- Completed questionnaires cannot be overwritten through the draft-progress endpoint.
- Results offer navigation to AI chat and wellness.

The questionnaire's reflections and recommendations are **rule-based**, rather than Gemini-generated. There is no general assessment flow outside the supported age groups.

Key files: `frontend/src/app/components/AdaptiveMoodCheckin.jsx`, `backend/routes/moodCoachRoutes.js`, `backend/models/MoodCheckin.js`.

### 3.7 Journaling and optional AI analysis

- Users can list, create, open, edit and delete their own journal entries.
- Entries store title, body, mood, tag, timestamps, and AI-analysis permission.
- The editor includes an opt-in analysis control. Creating a consented entry can trigger automatic analysis.
- Existing entries have an analysis action requiring an explicit consent value in the request, and a refresh action.
- Analysis returns emotional patterns, stress triggers, positive developments, recurring concerns, and an optional recommended catalog exercise.
- The interface displays analysis sections and can navigate to the recommended wellness activity.
- Analysis is saved with the journal and also cached in memory for 30 minutes.
- Detected crises on the explicit analysis endpoint produce crisis guidance instead of ordinary analysis.

The current editor preserves/defaults mood and tag values in save requests; dedicated editing controls for those metadata fields are not evident. Analysis covers one entry at a time, not a longitudinal journal report.

Key files: `frontend/src/pages/Journal.jsx`, `backend/routes/journalRoutes.js`, `backend/models/Journal.js`, `backend/services/geminiService.js`.

### 3.8 Wellness library, exercises and feedback

Eight wellness activities exist in the catalog:

| ID | Activity | Category |
| --- | --- | --- |
| `breath` | Guided Breathing | Breathing |
| `box` | Box Breathing | Breathing |
| `sleep` | Sleep Ritual | Sleep |
| `scan` | Body Scan | Grounding |
| `gratitude` | Gratitude Pause | Mindfulness |
| `morning` | Morning Intention | Mindfulness |
| `ground` | 5-4-3-2-1 Grounding | Grounding |
| `movement` | Gentle Movement Break | Movement |

- Activities have descriptions, durations and written steps.
- The page supports text search and category filters.
- Activity detail views can open directly through `/wellness?activity=<id>`.
- A breathing timer offers 2-, 3- and 5-minute durations, an animated breathing cue, pause/resume, reset and completion state.
- Guided video mappings exist for the activities, alongside a separate UCLA mindfulness video.
- Signed-in users can save helpful/neutral/not-helpful feedback for the UCLA video.
- A backend endpoint can retrieve the latest 30 saved feedback sessions.

The feedback model/API currently accepts **only `ucla-mindfulness`**. It is not general activity-completion tracking. The frontend maintains its own copy of the eight activity definitions rather than importing the shared JSON.

Key files: `frontend/src/pages/Wellness.jsx`, `shared/wellnessCatalog.json`, `backend/services/wellnessService.js`, `backend/routes/wellnessRoutes.js`, `backend/models/WellnessSession.js`.

### 3.9 Personalized wellness recommendations

- The wellness page lets users request recommendations from selected mood and/or chat data sources.
- The backend checks permission, gathers recent context, performs a crisis check, and selects catalog activities.
- In `AI_MODE=live`, it attempts Gemini recommendations and falls back to rules on failure.
- Outside live mode, this endpoint uses rule-based recommendations.
- Rules score concern/tag matches and mood-based activity preferences and return up to three activities.
- Recommendations include reasons and direct activity links.
- A refresh option bypasses the 15-minute in-memory recommendation cache.
- A separate older wellness endpoint retrieves recommendations from the latest completed questionnaire. The current wellness page instead calls `/api/recommendations`.

Key files: `backend/routes/recommendationRoutes.js`, `backend/services/recommendationService.js`, `moodContextService.js`, `cacheService.js`, `frontend/src/pages/Wellness.jsx`.

## 4. Frontend route inventory

| Route | Existing page/status |
| --- | --- |
| `/` | Landing page and personalized dashboard behavior |
| `/register` | Registration and local-only goal selection |
| `/signin` | Sign-in form |
| `/chat` | Persisted AI conversations |
| `/mood` | Mood logging, trends and embedded check-in |
| `/journal` | Journal CRUD and AI analysis |
| `/wellness` | Activity library, recommendations, timer and videos |
| `/about` | Static company, mission and team content |
| `/blog` | Hardcoded article previews; no article-detail route or content backend |
| `/careers` | Static job listings; Apply buttons lack an application workflow |
| `/press` | Static press content; download buttons lack implemented download actions |
| `/privacy` | Static policy copy; some claims exceed the implementation |
| `/terms` | Static terms copy |
| `/cookies` | Local toggle state; Save preferences has no persistence handler |
| `/crisis` | Crisis information and external resources |
| Any unmatched path | Not-found page |

All pages use a shared navigation/footer layout. Responsive styles and reusable UI primitives exist. The route configuration has no centralized protected-route wrapper; APIs enforce authentication and individual pages handle missing tokens.

## 5. Backend endpoint inventory

Paths below include the prefixes mounted in `backend/server.js`.

| Area | Endpoints |
| --- | --- |
| API health | `GET /` |
| Accounts | `POST /api/auth/signup`, `POST /api/auth/signin`, `GET /api/auth/count` |
| Moods | `GET /api/moods`, `GET /api/moods/date/:dateStr`, `POST /api/moods`, `PUT /api/moods/:id`, `DELETE /api/moods/:id` |
| Check-in | `GET /api/mood-coach/progress/:moodEntryId`, `PUT /api/mood-coach/progress`, `POST /api/mood-coach/finish` |
| Chat | `POST /api/chat` |
| Conversations | `GET/POST /api/chat/conversations`, `GET/PATCH/DELETE /api/chat/conversations/:id` |
| Journals | `GET/POST /api/journals`, `GET/PUT/DELETE /api/journals/:id`, `POST /api/journals/:id/analyze` |
| Recommendations | `POST /api/recommendations` |
| Wellness | `GET /api/wellness/recommendations`, `GET/POST /api/wellness/sessions` |

Health and account endpoints are public. The product-data endpoints use JWT authentication and user-scoped database queries.

## 6. Saved data models

| Model | Main stored data |
| --- | --- |
| `User` | Name, unique email, hashed password, role, profile picture, phone |
| `Conversation` | Owner, title, embedded messages, crisis/scope flags, optional message exercise metadata |
| `Mood` | Owner, score, label, emoji, emotions, note, date string |
| `MoodCheckin` | Owner, mood reference, age group, answers, progress, completion, reflection, recommendations |
| `Journal` | Owner, title, text, mood/tag, AI permission, structured AI analysis |
| `WellnessSession` | Owner, UCLA mindfulness activity ID, helpfulness response |

Models have timestamps. Conversation, mood, check-in and journal models include synthetic-data flags; context retrieval filters them out. No seed generator was found. Message recommendation fields exist in the conversation schema, but normal chat generation currently saves response text rather than structured exercise recommendations.

## 7. Configuration and development workflow

| Variable | Purpose and behavior from code |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing and verification |
| `PORT` | Backend port; defaults to **5001** |
| `GEMINI_API_KEY` | Google GenAI SDK API key |
| `GEMINI_MODEL` | Model override; source default is `gemini-3.5-flash-lite` |
| `AI_MODE` | Chat/journal mock mode when `mock`; recommendation Gemini path only when `live` |
| `VITE_API_URL` | Frontend API base URL; defaults to **http://localhost:5000** |

The model name above is a source-code default, not a verified statement about provider availability. The GenAI client is created at module load, so mock-mode startup with no key should be checked rather than assumed to work.

- Frontend scripts: `npm run dev`, `npm run build`, executed from `frontend/`.
- Backend scripts: `npm run dev` through nodemon, `npm start` through Node, executed from `backend/`.
- PowerShell in this environment blocks `npm.ps1`; `npm.cmd` works without changing execution policy.
- CORS is fixed to `http://localhost:5173` with authorization and content-type headers permitted.
- No root start/build orchestration, environment example file, automated test suite, lint script, CI workflow, Docker setup, or deployment configuration was found in the reviewed tree.

## 8. Gaps and issues to resolve before expansion

| Priority | Finding | Consequence / next action |
| --- | --- | --- |
| High | Backend defaults to port 5001 while frontend defaults to 5000 | Configure `VITE_API_URL` or align defaults so local requests reach the API. |
| High | Privacy page and footer claim device-side/end-to-end encryption | The reviewed code sends readable text to the API and stores string fields without client-side encryption. Update claims to match behavior or implement a deliberate encryption design. |
| High | Public signup accepts a caller-supplied role | A custom request can request `admin` or `therapist`. Restrict public registration before adding privileged workflows. Current middleware verifies JWTs but does not enforce role authorization. |
| High | Recommendation cache key includes user and chat toggle, but omits the mood toggle | Chat-only and mood-plus-chat requests can share cached results. Include every consent/data-source dimension in the key and check behavior when permissions change. |
| High | Journal edits delete memory cache but leave stored `aiAnalysis` intact | The analysis endpoint can reuse analysis of old content. Invalidate stored analysis on content changes or bind analysis to a content version/hash. |
| Medium | Mobile logout uses an undefined `navigate` function | Clicking mobile logout can throw after local storage is cleared. The surrounding JSX also contains literal `_jsx(...)` fragments that need cleanup. Build success does not catch this runtime issue. |
| Medium | Check-ins emit `breathing`, `grounding`, `mindfulness`, `journaling`, etc.; the eight-item catalog uses `breath`, `ground`, `scan`, etc. | The older recommendation endpoint and catalog do not have a consistent activity contract. Consolidate IDs and define destinations, especially for journaling. |
| Medium | Wellness catalog is duplicated in frontend source | Changes can drift between UI activities and backend recommendation data. Use one shared definition with frontend icon/video metadata layered on top. |
| Medium | Journal save consent uses truthiness; several consent controls start checked | Require strict boolean validation and review how permission is explained and recorded. One-off analysis also saves permission for later context reuse, which should be explicit to users. |
| Medium | Request validation is uneven | Public auth lacks robust email/password validation; several IDs, text lengths, types and dates rely on database errors or limited checks. Add consistent validation and useful 4xx responses. |
| Medium | Mood user/date index is not unique | Concurrent saves can create duplicate daily entries. Consider a unique index and atomic upsert after addressing any existing duplicates. |
| Medium | Recommendation cache is not invalidated when source data changes | Results can lag behind recent mood/chat changes until expiry or refresh. Add invalidation or versioned keys. |
| Medium | Histories and lists have no general pagination | Mood/journal/conversation lists can grow large. Chat messages are embedded in one document and entire message histories are read/returned. Plan pagination and conversation limits. |
| Medium | Rate limiting exists for chat only | Authentication and AI analysis/recommendation calls lack comparable controls. Add appropriate limits before broader usage. |
| Medium | Regex safety and scope filters have limited coverage | Evaluate realistic phrasing, negation, context and languages; avoid treating current patterns as a validated safety system. |
| Low | Markdown link URLs are used directly | Add an explicit allowed-protocol policy and renderer checks before expanding AI formatting. Raw HTML is not injected by this renderer. |
| Low | Build emits a large-bundle warning | Add route-level lazy loading or suitable chunking when optimizing load time. |
| Low | Static content promises settings/export/deletion capabilities not implemented | Align policy/product text with real account controls. Blog, careers, press and cookie controls also need functional workflows if retained. |
| Low | Root lockfile, unexplained `icacls` file, sparse README and generated-style JSX | Clarify repository artifacts, document setup, and gradually clean source for maintainability. |

Other boundaries: cache and request-limit state are process-local; there is no shared cache service, central error-handling layer, or demonstrated monitoring setup. No conclusion about database-at-rest or hosting security can be drawn from these application files.

## 9. Features not yet implemented

The design roadmap mentions several areas that are not present as working product modules:

- Therapist directory, therapist profiles, appointment booking, and availability management.
- Therapist dashboard, client notes, and role-based access controls.
- Admin dashboard, user management, moderation, and administrative analytics.
- Profile/settings editing, persisted onboarding goals and preferences.
- Password reset, email verification, refresh-token/revocation flows, and server-side logout.
- User account deletion and complete data export.
- Scheduled reminders, email notifications, push notifications, and notification preferences.
- Full blog articles or a content management system; functional careers applications and press downloads.
- General wellness session completion/history UI and progress tracking across all activities.
- Cross-entry journal analytics and a unified long-term wellness overview.
- Voice input/output, file attachments, real-time response streaming, payments, or subscription billing.

These are absent capabilities or roadmap opportunities, not tasks completed by this review.

## 10. Suggested order for future work

1. **Stabilize the existing flow:** align API configuration, fix mobile logout, unify activity IDs/catalog usage, and correct analysis/cache invalidation.
2. **Make account and consent behavior reliable:** restrict registration roles, strengthen validation, clarify AI permission scope, and align privacy text with implementation.
3. **Add meaningful integration checks:** auth and user isolation, mood save/check-in resume, chat persistence, journal edit/reanalysis, consent-sensitive recommendations, and feedback saving.
4. **Complete personal settings:** saved goals, profile editing, password recovery, export, account deletion, and persisted preferences.
5. **Improve the current wellness loop:** track activity completion and feedback across the library, then build a history/progress view.
6. **Expand into human support:** therapist directory and appointments, followed by therapist/admin tools with server-side role authorization.
7. **Prepare deployment and growth:** configurable CORS, setup examples, CI, monitoring, paginated data access, load-time improvements, and shared infrastructure where needed.

## 11. Verification performed

- **Frontend production build:** passed using `npm.cmd run build` in `frontend/`; Vite transformed 2,247 modules. The build warned that the main JavaScript chunk is approximately 803 kB before gzip, exceeding its 500 kB warning threshold.
- **Backend syntax:** all application `.js` files passed `node --check`; installed dependency files were excluded.
- **Source integration review:** traced frontend fetch calls to mounted routes and reviewed models, services, consent paths, activity IDs, configuration, and static-page actions.
- **Not performed:** launching the API against MongoDB, authenticated browser testing, live Gemini requests, external resource verification, load testing, or security/clinical certification.

The project has substantial core application code already in place. Use this report as the baseline inventory for planning additions, while treating the integration gaps and unverified runtime paths above as pending work.
