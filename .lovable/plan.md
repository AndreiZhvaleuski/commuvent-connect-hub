## Goal

Once an event has ended (`now > end_at`), check-ins and RSVP changes should be blocked. Additionally, a user who has already checked in cannot cancel their RSVP. Hosts get an override on check-in for late arrivals.

## Backend (edge functions)

**`check_in_by_code`**
- Load `events.end_at` along with `host_id`.
- If `now > end_at` AND the caller is not a `host` role (only `checker`), return `{ status: "event_ended" }`.
- Hosts (`role = 'host'`) bypass the time check (override).

**`check_in_undo`**
- Same rule: if `now > end_at` and caller is not a `host`, return `{ ok: false, error: "event_ended" }`.

**`rsvp_create`**
- Reject if `now > end_at` → `{ error: "event_ended" }`.
- (Already rejects host members and re-uses an existing non-cancelled RSVP, so "already checked in" implies an existing going RSVP and is already covered — no double-RSVP possible.)

**`rsvp_cancel`**
- Reject if `now > events.end_at` → `{ error: "event_ended" }`.
- Reject if a non-undone `check_ins` row exists for this RSVP → `{ error: "already_checked_in" }`.
- Skip waitlist promotion in those cases (function already returns early).

## Frontend

**`src/pages/CheckIn.tsx`**
- Compute `ended = now >= end_at` (already have `now` ticking).
- When `ended && !isHost`:
  - Disable the code input, Check-in button, and Undo button.
  - Show an inline `Alert` above the form: "This event has ended. Check-in is closed."
- When `ended && isHost`:
  - Keep input enabled but show a warning banner: "Event has ended — host override active. Late check-ins will be recorded."
- Map new `event_ended` status from the function to a clear toast.

**`src/pages/EventPage.tsx`** (RSVP button)
- If event ended: disable RSVP button with label "Event ended" and tooltip/help text.
- Surface `event_ended` error from `rsvp_create` as a toast.

**`src/pages/Tickets.tsx`**
- Cancel button: hide/disable if event ended OR user has a check-in for that RSVP.
  - Easiest: include `check_ins(id, undone)` in the existing `rsvps` select, then disable the button when there's a non-undone check-in or `end_at < now`.
  - Show small helper text: "Already checked in — cannot cancel" or "Event ended".
- Map `event_ended` / `already_checked_in` errors to friendly toasts.

## Technical notes

- No DB schema changes required. RLS already restricts who can read what; all enforcement lives in the edge functions which use the service role.
- `check_ins` already has `undone` — "checked in" means `EXISTS check_ins WHERE rsvp_id = r.id AND undone = false`.
- Host override is determined by `host_members.role = 'host'` (vs `checker`), matching the existing `isHost` flag in CheckIn.tsx.
- The Tickets page query change is small: `.select("…, check_ins(id, undone)")` — relies on the implicit relationship via `rsvp_id`. If PostgREST can't infer it, fall back to a separate `check_ins` query keyed by the loaded RSVP ids.

## Out of scope

- No grace window after `end_at` (hard cutoff, host override only).
- No retroactive cleanup of stale waitlist promotions on already-ended events.
- QR scanning (still "coming soon").
