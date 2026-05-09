# Commuvent — build report

## Overview

Commuvent is a lightweight community event hosting & attendance platform
built end-to-end during a short MVP time-box on Lovable. It covers the
full lifecycle: a host self-registers, publishes an event, attendees
RSVP and receive a QR ticket, a checker verifies codes at the door,
and the host exports attendance and reviews post-event feedback,
photos and reports.

The full reviewer-facing flow is documented in
[WALKTHROUGH.md](./WALKTHROUGH.md).

---

## Tools & techniques

- **Lovable** as the AI-pair build environment, generating React
  components, routes, edge functions and SQL migrations from chat
  iterations.
- **Frontend:** React 18 + Vite 5 + TypeScript 5 + Tailwind 3 +
  shadcn/ui, with `framer-motion` for hero motion and
  `@phosphor-icons/react` for iconography.
- **Backend:** Supabase end-to-end — Postgres with strict RLS, Auth
  (email/password + magic link), Storage (`event-covers`,
  `host-logos`, `gallery`), Edge Functions for privileged writes, and
  Realtime for live RSVP / check-in / notification updates.
- **Notable libraries:** `qrcode.react` for ticket QR generation,
  `ics` for calendar export, custom CSV builder with UTF-8 BOM and
  formula-injection guard.
- **One-shot demo seed:** an idempotent `seed_demo` edge function
  (guarded by `SEED_SECRET`) wipes auth users + tables + storage
  buckets and re-seeds 3 hosts × 3 events with attendees, RSVPs,
  check-ins, photos and feedback — used both for the deployed demo and
  for local resets.

---

## Architecture decisions

- **RLS-first access control with `SECURITY DEFINER` helpers.** All
  cross-table membership checks live in stable security-definer
  functions (`is_host_member`, `has_host_role`, `is_event_host_member`,
  `is_report_target_host_member`, `can_view_profile`). This avoids the
  classic recursive-RLS pitfall where a policy on table A queries
  table B which queries table A.
- **Privileged writes go through Edge Functions, not the client.**
  `rsvp_create`, `rsvp_cancel`, `event_set_capacity`,
  `check_in_by_code`, `check_in_undo` all run with the service role
  internally. The corresponding tables (`check_ins`, `rsvps`) have
  **no client-facing INSERT/UPDATE/DELETE policies at all** — the
  edge functions are the only write path. This makes capacity
  enforcement, FIFO waitlist promotion, duplicate check-in prevention
  and the "no check-in after end_at" rule authoritative on the server.
- **Validation triggers, not CHECK constraints**, for time-based
  rules (e.g. `end_at > start_at + 30 min`) so they remain mutable
  and safely restorable.
- **Realtime channels** on `rsvps`, `check_ins` and `notifications`
  with `replica identity full` — the check-in page and tickets page
  update without polling, and waitlist promotions notify the affected
  attendee instantly.
- **CSV export client-side** with three concrete guarantees: UTF-8
  BOM (so Excel reads it as Unicode), a formula-injection guard that
  prefixes `=`, `+`, `-`, `@` with `'`, and ISO-8601 timestamps in
  the event's IANA TZ.
- **No client mock data, ever.** Every list has a real empty state and
  a real error state; the seed function is the single source of demo
  content.

---

## What worked

- **Lovable iteration speed.** Going from a SQL schema sketch to a
  working dashboard with realtime counters took an evening. Schema
  changes flow through one tool call and the generated types update
  automatically.
- **shadcn/ui primitives** kept the visual language consistent across
  ~20 pages without bespoke component work.
- **Edge Functions as the only write path** for sensitive tables made
  the security review trivial — all the rules live in one place per
  operation, instead of being spread across multiple RLS policies.
- **The `seed_demo` function** turned demo upkeep into a one-click
  reset right before submission. Reviewers see fresh "in-progress"
  and "upcoming" timestamps without us hand-editing rows.
- **The `useAsyncResource` hook** (debounce + keep-previous-data)
  made filtered list pages (Explore, My Events) feel snappy even
  while waiting for new query results.

---

## What didn't / trade-offs

- **Markdown editor removed late.** We initially shipped Tiptap +
  `react-markdown` for event and host descriptions. After auditing
  the XSS surface and considering MVP scope, we ripped it out
  (~5 packages, two components, sanitisation logic in `og-preview`)
  in favour of a plain `<textarea>` + `whitespace-pre-line`.
- **Paid events stubbed.** The Free/Paid toggle is in the editor with
  Paid disabled and a "Coming soon" tooltip — payment integration is
  out of MVP scope.
- **Location filter is mode-only.** We render Any / Offline / Online
  chips and a free-text search across `venue_address`. There is no
  city/region dropdown because there is no normalised city column on
  events; adding one is a future migration.
- **No QR camera scanning.** The spec explicitly allows manual entry,
  and a code input keeps the check-in flow keyboard-friendly and
  works on every device without permission prompts.
- **Email notifications not wired.** Waitlist promotions and other
  state changes show up as in-app notifications + realtime UI updates
  only.
- **Shared demo password printed in-UI.** `Password123!` is shown on
  the `/sign-in` demo panel. Acceptable for a review-only deployment;
  it would be removed before any real-world launch.
- **No soft-delete.** Reports hide rather than delete content. We
  judged that adequate for the MVP review queue.

---

## Notable decisions

- **Profiles vs auth.users.** All user-facing metadata lives in
  `public.profiles` keyed by `auth.uid()` and populated by a
  `handle_new_user` trigger. We never reference `auth.users` from the
  client.
- **Roles via `host_members`, not on the user.** Users are members of
  hosts with a role (`host` or `checker`). This keeps role checks
  scoped per-host and lets one user be a host of one org and a
  checker of another.
- **Visibility separated from status.** `visibility` (`public` |
  `unlisted`) is independent from `status` (`draft` | `published`).
  Unlisted-published events render publicly only via direct link;
  drafts are invisible to non-members.
- **Time zones are first-class.** Every timestamp is `timestamptz`,
  every event carries an IANA `time_zone`, the UI displays in the
  event's TZ with a tooltip showing the viewer's local equivalent,
  and CSV exports use the event's TZ offset.
- **Storage policies mirror RLS.** All three buckets are public-read;
  inserts require auth; gallery rows are forced to `pending` by a
  trigger, regardless of what the client tries to insert.
