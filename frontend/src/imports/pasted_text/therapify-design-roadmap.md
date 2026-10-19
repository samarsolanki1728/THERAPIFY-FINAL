Therapify — Figma UX Design Roadmap
1. Design Principles (decide these before opening Figma)
Principle	What it means for Therapify
Calm over stimulating	Muted palettes, generous whitespace, soft shadows — no saturated reds/oranges except for critical safety alerts
Predictable, not surprising	Consistent navigation, no sudden pop-ups; anxious users need low cognitive load
Human, not clinical	Rounded corners, warm neutrals, illustration over stock photos/icons that feel like a hospital app
Gentle hierarchy	One primary action per screen; secondary actions visually quieter
Safety is visible but not scary	"Talk to a professional" prompts should look like care, not a warning label
2. Visual Foundations
Color Palette (calm/peaceful direction)

Primary: Sage green or soft teal (#7C9885 / #5B8A87) — associated with calm, growth
Secondary: Warm sand/beige (#F2E9DC) — grounding, non-clinical background
Accent: Muted lavender (#B5A8D9) — for AI/chat elements, signals "thoughtful"
Alert (safety layer only): Soft amber, NOT harsh red — reserve true red only for crisis escalation
Neutrals: Warm greys (#4A4A48, #8C8C88) instead of pure black/white
Typography

Headings: A humanist sans-serif (e.g., "Inter", "Poppins", or "Nunito Sans") — rounded terminals feel friendlier
Body: Same family or a highly legible pair (e.g., "Inter" body + "Poppins" headings)
Generous line-height (1.5–1.7) for journaling/chat text — reduces reading fatigue
Spacing & Shape

8px base spacing grid
Rounded corners (12–20px) on cards, buttons, chat bubbles
Soft, low-opacity shadows instead of hard borders
3. Figma File Structure
Therapify Design System (Figma file)
├── 🎨 Foundations
│   ├── Color styles
│   ├── Typography styles
│   ├── Spacing/grid
│   ├── Iconography (use a calm icon set — Phosphor or Lucide, rounded style)
│   └── Elevation/shadow styles
├── 🧩 Components
│   ├── Buttons (primary/secondary/ghost/danger)
│   ├── Chat bubble (user/AI)
│   ├── Mood selector (emoji/slider)
│   ├── Cards (journal entry, therapist profile, activity)
│   ├── Nav bar / sidebar
│   ├── Forms & inputs
│   ├── Charts (mood trend line, weekly bar)
│   ├── Modals/toasts (non-intrusive)
│   └── Safety banner component
├── 📱 Screens — User
├── 📱 Screens — Therapist
├── 📱 Screens — Admin
└── 🔄 Prototype flows
4. Screens to Design (in build order)
Phase A — Core Identity

Onboarding / welcome flow (3–4 calm intro slides)
Login / Register
Home dashboard (greeting, mood check-in prompt, quick stats)
Phase B — Core Loop 4. AI Chat interface (this is your flagship screen — get it right)

Message bubbles, typing indicator, gentle safety banner state, suggested prompts
Mood tracker (log mood + emotion + intensity)
Mood trend dashboard (weekly/monthly charts using Recharts-style visuals)
Phase C — Reflection 7. Journal list + entry editor 8. AI-generated reflection card (subtle, collapsible — not intrusive)

Phase D — Guided Support 9. Wellness recommendations feed (breathing, mindfulness cards) 10. Assessment/questionnaire flow (progress bar, non-clinical tone) + results screen (explicitly non-diagnostic framing)

Phase E — Human Connection 11. Therapist directory + profile 12. Appointment booking flow

Phase F — Admin/Therapist Views 13. Therapist dashboard (appointments, client notes) 14. Admin dashboard (user management, analytics, moderation)

5. Prototyping & Handoff
Build interactive prototypes for the chat flow and mood-check-in flow first — these are your research demo centerpieces.
Use Figma's Auto Layout everywhere so components adapt cleanly to real content (chat messages vary in length, journal entries vary).
Create a mobile + desktop variant at least for chat and dashboard (responsive is expected for a modern MERN app).
Export a style guide page summarizing colors/type/spacing — useful for your research paper's "Proposed System" section too (UI screenshots strengthen your dissertation).
6. Suggested Timeline (aligns with your Phase 1–14 roadmap)
Week	Focus
1	Foundations (color, type, grid, icons) + component library skeleton
2	Core components (buttons, chat bubble, cards, nav)
3	Screens: Onboarding, Auth, Home dashboard
4	Screens: Chat interface + safety states (critical — iterate here)
5	Screens: Mood tracker + trend dashboard
6	Screens: Journal + reflections
7	Screens: Wellness recs + assessment flow
8	Screens: Therapist directory + booking
9	Admin/Therapist dashboards
10	Prototype linking, usability test pass, polish
7. Quick Figma Tips for This Kind of App
Use components with variants for the chat bubble (user/AI/safety-alert states) so devs can map 1:1 to React components.
Keep a "Safety State" variant for every relevant component (chat, banner, modal) so the safety layer is visually designed from day one, not bolted on later.
Name layers/frames to match your planned React component names — speeds up frontend handoff significantly.


Disclaimer
This email is governed by the Disclaimer Terms of  somaiya.edu which may be viewed at https://www.somaiya.edu/en/email-disclaimer

Finally, please do not print this email unless it is necessary. Every unprinted email helps the environment.

