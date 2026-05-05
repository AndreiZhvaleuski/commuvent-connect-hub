# Commuvent

> Where community meets event.

Commuvent is a lightweight, free-only community event hosting & attendance
platform. Hosts publish events, attendees RSVP and grab a ticket, and
checkers verify codes at the door — all in one mobile-first app.

Built with React + Vite + TypeScript + Tailwind + shadcn/ui on top of
Supabase (Postgres + Auth + Storage + Edge Functions + Realtime).

---

## Demo data

A one-time idempotent migration seeds:

- **Host:** Riverside Community Club (`/h/riverside-community-club`)
- **Upcoming event:** Riverside Sunset Picnic (~14 days from now, capacity 50)
- **Past event:** Spring Cleanup & Coffee (~14 days ago, capacity 30,
  20 confirmed RSVPs, 15 check-ins) — so the dashboard shows real numbers.
- **Demo checker invite link** (role = `checker`):

  ```
  /invite/demo-checker-invite-token
  ```

  Open it while signed in to join Riverside Community Club as a checker.

---

## Try every flow in 5 minutes

> **Sign up note:** email confirmation is **off** for the demo. Use any
> email + password on `/sign-up` and you're in immediately. Magic-link
> sign-in is also supported.

### 1. Browse & RSVP (attendee)
1. Visit `/explore` — toggle "Include past" to see both seeded events.
2. Open **Riverside Sunset Picnic** → click **RSVP**.
3. If signed out, you'll be redirected to `/sign-in` and bounced back
   with the RSVP dialog auto-opened.
4. Open `/tickets` to see your QR code, ticket code, "Add to calendar"
   (Google + .ics), and a Cancel button. Position updates live for
   waitlisted RSVPs via Realtime.

### 2. Become a host
1. Visit `/become-a-host` and create your own host (logo upload, bio,
   contact email).
2. Land on `/dashboard/:hostId` with Upcoming / Past tabs and per-event
   Going / Waitlist / Checked-in stats.
3. Hit **New event** → fill the editor (markdown description, IANA
   time-zone picker, cover upload, capacity, visibility, draft/published).
   Note: the **Free / Paid** toggle is shown but Paid is disabled with a
   "Coming soon" tooltip.

### 3. Run the door (checker / host)
1. From the dashboard, open **Check-in** for an event (or visit
   `/checkin/:eventId`).
2. Type a ticket `code` from `/tickets` → big Submit. Aria-live counters
   update in real-time (Going / Checked-in / Remaining).
3. **Undo last scan** rolls back the most recent check-in.

### 4. Export RSVPs
1. From a host event, open **RSVPs** and click **Export CSV**.
2. The file is UTF-8 with BOM, ISO-8601 times in the event's TZ, columns:
   `name,email,rsvp_status,check_in_time`. Opens cleanly in Excel and
   Google Sheets — non-ASCII names render correctly.
3. A schema preview + downloadable example lives at `/about` (no sign-in).

### 5. Gallery, feedback, reports
1. On any event page, scroll to **Gallery** and upload a photo (auth
   required). Photos start as `pending` — only approved photos render
   publicly.
2. After an event ends, the **Feedback** form appears (1–5 stars + optional
   comment, one per user per event).
3. Use **Report** on the event or any photo to file a report.
4. Hosts triage everything at `/dashboard/:hostId/moderation`:
   gallery queue (Approve / Reject) and reports queue (Hide / Dismiss).

---

## Tech notes

- **Time zones:** all timestamps are `timestamptz`; UI displays in the
  event's IANA TZ with a tooltip showing the viewer's local time.
- **Realtime:** `rsvps`, `check_ins`, and `notifications` are added to
  `supabase_realtime` with `replica identity full`.
- **Privileged ops** (RSVP create/cancel, capacity promotion, check-in by
  code, undo) live in Edge Functions using the service role internally.
- **Storage buckets:** `host-logos`, `event-covers`, `gallery` (all
  public-read; insert restricted to authenticated users; gallery rows
  forced to `pending` by a DB trigger).
- **No mock data** in the UI — empty states everywhere, and the seed
  migration is the single source of demo content.

See [`report.md`](./report.md) for the build journal and decisions, and
[`sample-exports/rsvps.csv`](./sample-exports/rsvps.csv) for an example
RSVP export.
