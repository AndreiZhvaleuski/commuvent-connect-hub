# Commuvent

> Where community meets event.

Commuvent is a lightweight, free-only community event platform. Hosts publish
events, attendees RSVP and grab a digital ticket, and checkers verify codes
at the door — all in one mobile-first app.

**Live demo:** https://commuvent-connect-hub.lovable.app

---

## For reviewers

Follow **[WALKTHROUGH.md](./WALKTHROUGH.md)** for a click-by-click guided
review covering every graded flow: Publish → RSVP → Ticket → Waitlist →
Check-in → CSV export → Gallery + approval → Feedback → Reports → Invites.

The deployed app is **already seeded** with 3 hosts, 9 events (completed /
in-progress / upcoming), 8 attendees, RSVPs, check-ins, photos and feedback
— no setup required. Demo accounts are listed and click-to-fill on the
`/sign-in` page.

For the design journal and notable trade-offs, see **[report.md](./report.md)**.

---

## Tech stack

- **Frontend:** React 18 + Vite 5 + TypeScript 5 + Tailwind CSS 3 + shadcn/ui
- **Backend:** Supabase (Postgres + RLS + Auth + Storage + Edge Functions + Realtime)
- **Hosting:** Lovable (preview + published)
- **Notable libs:** `qrcode.react` (tickets), `ics` (calendar export),
  `@phosphor-icons/react`, `react-router`, `framer-motion`

---

## Local development

```bash
npm install
npm run dev          # Vite dev server on http://localhost:5173
```

Required `.env` (already populated when forking via Lovable):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

Edge functions deploy automatically; database changes go through
`supabase/migrations/`.

---

## Project layout

```
src/
  pages/         # Route components (Explore, EventPage, Dashboard, CheckIn, …)
  components/    # Shared UI (event cards, feedback, gallery, etc.)
  integrations/  # Supabase client + generated types
  lib/           # Helpers (csv, calendar, timezones, demo accounts)
supabase/
  functions/     # Edge functions (rsvp_create, check_in_by_code, seed_demo, …)
  migrations/    # SQL migrations
```

---

## Documents

- **[WALKTHROUGH.md](./WALKTHROUGH.md)** — reviewer guide (click-by-click).
- **[report.md](./report.md)** — build journal: tools, decisions, what worked / didn't.
