# Reviewer walkthrough

Click-by-click guide covering every graded flow on the live demo:
**https://commuvent-connect-hub.lovable.app**

> If the site doesn't load in your region, try using a VPN — the Lovable
> hosting service may be blocked in some countries.

> Each flow ends with a **Recording** section embedding a short iPhone
> screen recording (`videos/flow-<letter>.mp4`). Convert iPhone `.mov`
> files to `.mp4` (H.264 + AAC) so GitHub plays them inline.

---

## Conventions used in every flow

- Each step is one atomic action. Click, type, or toggle exactly what is
  written. Exact values are in `backticks`.
- *Expect:* lines describe the observable outcome (toast, badge, redirect).
- "**Open the main page**" always means: **click the Commuvent header /
  logo (top-left)**. Never type a URL by hand.
- Two-window flows say **Window 1** / **Window 2** and run the
  Reset & sign-in block independently in each window (use a private /
  incognito window for window 2 so the sessions don't collide).

### Reset & sign-in (referenced by every flow)

- **Demo password (all accounts):** `Password123!`

1. Click the **Commuvent** header/logo (top-left) to open the main page.
2. If a user avatar shows in the top-right, click it → **Sign out**.
3. Click **Sign in** in the top-right.
4. On the sign-in card, click the **user-icon** button to open the
   **Demo accounts** panel.
5. Click the **Hosts** / **Checkers** / **Attendees** tab as the flow
   instructs.
6. Click the listed `<email>` row to auto-fill, then click **Sign in**.

   *Expect:* you land on `/dashboard/<hostId>` for hosts and checkers,
   or on `/` for attendees.

---

## Seeded data this walkthrough relies on

| Role     | Email                              | Notes                       |
|----------|------------------------------------|-----------------------------|
| Host     | `host.alice@demo.commuvent.app`    | Owns **Acme Tech Talks**    |
| Host     | `host.bob@demo.commuvent.app`      | Owns Trailblazers Outdoors  |
| Host     | `host.clara@demo.commuvent.app`    | Owns Culinary Collective    |
| Checker  | `checker.dan@demo.commuvent.app`   | Acme — checker only         |
| Checker  | `checker.eve@demo.commuvent.app`   | Trailblazers — checker only |
| Checker  | `checker.finn@demo.commuvent.app`  | Culinary — checker only     |
| Attendee | `att.gina@…` … `att.noah@…`        | 8 demo attendees            |

**Events:** 9 total (3 per host × completed / in-progress / upcoming).
The upcoming **AI Hack Night** (Acme) has **capacity 4** — used for the
waitlist demo. The seed RSVPs all 8 attendees in deterministic order, so
`att.gina/henry/ivy/jack` are **going** and `att.kate/liam/mia/noah` sit
on the **waitlist** (in that order).

**Gallery:** every completed event is pre-loaded with **5 photos from 5
different attendees** — 2 approved, 2 pending, 1 rejected. Each
in-progress event has 1 pending photo.

**Reports:** the Reports tab is pre-populated with **3 open** reports
(2 events + 1 photo) and **2 historical** reports (1 hidden event,
1 dismissed photo).

> If anything looks stale or empty, re-run the `seed_demo` edge function
> (`POST /functions/v1/seed_demo` with header `x-seed-secret: <secret>`).
> It wipes everything and re-seeds in ~30s.

---

## Flow A — Browse as a guest

Run **Reset & sign-in** steps 1–2 only (sign out if needed; do **not**
sign back in).

1. Click **Explore** in the top nav.
   *Expect:* a grid of upcoming event cards and a Filters card.
2. In the **Search** field, type `AI`.
   *Expect:* the grid filters live as you type.
3. In the **Location** row, click the **Offline** chip.
4. Toggle **Include past events** ON.
   *Expect:* cards with an **"Ended"** badge appear.
5. Click the **Earliest** sort tab.
6. Click the card titled **Intro to LLM Agents**.
   *Expect:* event page shows an **Ended** banner; **no RSVP button**.
7. Click the browser **Back** button.
8. In the Filters card, click **Clear filters**.
9. Click the card titled **AI Hack Night**.
10. Click **RSVP**.
    *Expect:* redirect to `/sign-in?redirect=/e/<id>`.

### Recording

<video src="./videos/flow-a.mp4" controls playsinline muted width="640">
  Your browser doesn't support inline video.
  <a href="./videos/flow-a.mp4">Download the recording</a>.
</video>

---

## Flow B — Publish an event (Host)

Run **Reset & sign-in** as `host.alice@demo.commuvent.app` (Hosts tab).

1. *Expect:* you land on `/dashboard/<hostId>` for **Acme Tech Talks**
   with **Upcoming** / **Past** tabs and Going / Waitlist / Checked-in
   counts on each row.
2. Click **New event** (top right).
   *Expect:* the editor at `/dashboard/<hostId>/events/new`.
3. In **Title**, type `Reviewer Test Event`.
4. In **Description**, type `A short test event created during review.`.
5. In **Start time**, pick a time roughly **+1 hour from now**.
6. In **End time**, pick a time roughly **+3 hours from now**.
7. In **Time zone**, select `Europe/Berlin`.
8. In **Capacity**, type `10`.
9. Hover the **Paid** option of the Free / Paid toggle.
   *Expect:* Paid is disabled with a **"Coming soon"** tooltip.
10. Click **Upload cover** and pick any image from your device.
    *Expect:* a cover preview renders.
11. Set **Visibility** to **Public**.
12. Set **Status** to **Published**.
13. Click **Save changes**.
    *Expect:* toast `Saved`; you stay on the event manage page.
14. Click the **Commuvent** header/logo to open the main page, then
    click **Explore**.
    *Expect:* the new event appears in the grid.
15. Click the browser **Back** button to return to the manage page.
16. Click **Duplicate** in the manage header.
    *Expect:* toast `Duplicated`; you land on the new draft's editor.
17. Click your avatar (top-right) → **Sign out**.

### Recording

<video src="./videos/flow-b.mp4" controls playsinline muted width="640">
  Your browser doesn't support inline video.
  <a href="./videos/flow-b.mp4">Download the recording</a>.
</video>

---

## Flow C — RSVP, ticket & calendar (Attendee)

Run **Reset & sign-in** as `att.gina@demo.commuvent.app` (Attendees tab).

1. Click the **Commuvent** header/logo to open the main page.
2. Click **Explore** in the top nav.
3. In **Search**, type `AI Hack Night`.
4. Click the **AI Hack Night** card.
5. Click **RSVP**.
6. In the confirmation dialog, click **Confirm**.
   *Expect:* toast `You're going`; the header pill shows **Going**.
7. Click **My Tickets** in the top nav.
   *Expect:* a ticket card with QR code and a 6-character ticket code.
8. Click **Add to calendar** on the ticket.
9. Click **Download .ics**.
   *Expect:* a `.ics` file downloads with the correct title and times.
10. Click **Cancel RSVP** on the ticket.
11. In the confirmation dialog, click **Confirm**.
    *Expect:* toast `RSVP cancelled`; the ticket disappears.
12. Click your avatar (top-right) → **Sign out**.

### Recording

<video src="./videos/flow-c.mp4" controls playsinline muted width="640">
  Your browser doesn't support inline video.
  <a href="./videos/flow-c.mp4">Download the recording</a>.
</video>

---

## Flow D — Waitlist + automatic FIFO promotion (two windows)

The seed already over-subscribes **AI Hack Night** (capacity = 4):
`att.gina/henry/ivy/jack` are **going**, `att.kate/liam/mia/noah` sit
on the waitlist. Open a second **private / incognito** window for
Window 2 so the two sessions don't collide.

### Window 1 — Kate

1. Run **Reset & sign-in** as `att.kate@demo.commuvent.app`.
2. Click **My Tickets** in the top nav.
   *Expect:* a waitlist card for **AI Hack Night** showing
   **Waitlist · position 1**. No QR ticket yet.
3. Leave this window open and visible.

### Window 2 — Gina

4. Run **Reset & sign-in** as `att.gina@demo.commuvent.app`.
5. Click **My Tickets** in the top nav.
6. On the **AI Hack Night** ticket, click **Cancel RSVP**.
7. In the confirmation dialog, click **Confirm**.
   *Expect:* toast `RSVP cancelled`; the ticket disappears.

### Back to Window 1 — Kate (do **not** reload)

8. *Expect (realtime):* the top nav grows a numeric **`1`** badge next
   to **My Tickets**, and the waitlist card flips into a **Going**
   ticket with a QR code, prefixed by a highlighted callout
   *"You were promoted from the waitlist — your seat is confirmed."*
   plus an **Acknowledge** button. A top-of-page banner also offers
   **Acknowledge all**.
9. Click **Acknowledge** on the ticket (or **Acknowledge all** at the
   top).
   *Expect:* the callout disappears and the nav badge clears to zero.
10. Reload the page.
    *Expect:* the badge stays at zero (acknowledgement persisted).
11. In **both** windows, click the avatar (top-right) → **Sign out**.

### Recording

<video src="./videos/flow-d.mp4" controls playsinline muted width="640">
  Your browser doesn't support inline video.
  <a href="./videos/flow-d.mp4">Download the recording</a>.
</video>

---

## Flow E — Run the door (Checker, two windows)

Use a second **private / incognito** window for Window 2.

### Window 1 — Checker Dan

1. Run **Reset & sign-in** as `checker.dan@demo.commuvent.app`
   (Checkers tab).
   *Expect:* `/dashboard` shows a single Acme card with only a
   **Check-in** action (no New event / RSVPs / Moderation).
2. Click **Check-in** on the Acme card.
3. Click the row for **Live: TypeScript Performance** (in-progress).
   *Expect:* you land on `/checkin/<eventId>` with three live
   counters: **Going / Checked-in / Remaining**.
4. Leave this window open.

### Window 2 — Attendee Gina

5. Run **Reset & sign-in** as `att.gina@demo.commuvent.app`.
6. Click **My Tickets** in the top nav.
7. Find the ticket for **Live: TypeScript Performance** and copy its
   6-character code.

### Back to Window 1 — Dan

8. Click the **Ticket code** field and paste the code.
9. Click **Submit**.
   *Expect:* success toast; **Checked-in** counter +1.
10. Click **Submit** again with the same code still in the field.
    *Expect:* warning toast (already checked in); counters unchanged.
11. Click **Undo last scan**.
    *Expect:* success toast; **Checked-in** counter −1.
12. Click the **Commuvent** header/logo to open the main page, then
    click **Dashboard** → **Check-in** on the Acme card → click the
    row for **Intro to LLM Agents** (a completed event).
    *Expect:* a destructive **"Check-in is closed"** alert; the
    submit button is blocked.
13. In **both** windows, click the avatar (top-right) → **Sign out**.

### Recording

<video src="./videos/flow-e.mp4" controls playsinline muted width="640">
  Your browser doesn't support inline video.
  <a href="./videos/flow-e.mp4">Download the recording</a>.
</video>

---

## Flow F — Export RSVPs CSV (Host)

Run **Reset & sign-in** as `host.alice@demo.commuvent.app` (Hosts tab).

1. *Expect:* you land on `/dashboard/<hostId>`.
2. Click the **Past** tab.
3. Click the row for **Intro to LLM Agents**.
4. Click **RSVPs** in the manage page header.
5. Click **Export CSV**.
   *Expect:* a file downloads, e.g. `rsvps-intro-to-llm-agents.csv`.
6. Open the file in Excel or Google Sheets.
   *Expect:*
   - Encoding is **UTF-8 with BOM** — names like *Müller* render
     correctly without mojibake.
   - Columns are exactly: `name, email, rsvp_status, check_in_time`.
   - `check_in_time` is **ISO-8601** with the event's TZ offset, blank
     for non-checked-in rows.
   - At least ~6 rows of data, including both `going` and `waitlist`.
7. Click your avatar (top-right) → **Sign out**.

### Recording

<video src="./videos/flow-f.mp4" controls playsinline muted width="640">
  Your browser doesn't support inline video.
  <a href="./videos/flow-f.mp4">Download the recording</a>.
</video>

---

## Flow G — Gallery upload + host approval

The gallery + moderation queue is **already populated** by the seed.

### Part 1 — Host approves (`host.alice`)

1. Run **Reset & sign-in** as `host.alice@demo.commuvent.app`.
2. Click **Dashboard** in the top nav (if not already there).
3. Click **Moderation** in the dashboard header.
4. Click the **Gallery queue** tab.
   *Expect:* several pending photos across Acme's events, each
   labelled with the uploader's name.
5. On the **first** pending row, click **Approve**.
   *Expect:* toast confirmation; the row disappears.
6. On the next pending row, click **Reject**.
   *Expect:* toast confirmation; the row disappears.
7. Click the **Commuvent** header/logo to open the main page, then
   click **Explore** → toggle **Include past events** ON → open the
   event you just approved a photo for.
8. Scroll to the **Gallery** section.
   *Expect:* the newly-approved photo renders in the public grid.
9. Click your avatar (top-right) → **Sign out**.

### Part 2 — Attendee uploads (`att.gina`)

10. Run **Reset & sign-in** as `att.gina@demo.commuvent.app`.
11. Click **Explore** in the top nav.
12. Toggle **Include past events** ON.
13. Click the card titled **Intro to LLM Agents**.
14. Scroll to the **Gallery** section.
15. Click **Upload photo**, pick any image, then submit.
    *Expect:* the photo appears in your "Pending" tray; not yet public.
16. Click your avatar (top-right) → **Sign out**.

### Recording

<video src="./videos/flow-g.mp4" controls playsinline muted width="640">
  Your browser doesn't support inline video.
  <a href="./videos/flow-g.mp4">Download the recording</a>.
</video>

---

## Flow H — Feedback (post-event, gated)

Run **Reset & sign-in** as `att.gina@demo.commuvent.app`.

1. Click **Explore** in the top nav.
2. Toggle **Include past events** ON.
3. Click a completed event Gina was checked in to (e.g.
   **Intro to LLM Agents**).
4. Scroll to the **Feedback** section.
   *Expect:* a 1–5 star form with an optional comment field.
5. Click the **5th** star.
6. In the comment field, type `Great event!`.
7. Click **Submit**.
   *Expect:* toast `Thanks for your feedback`; the new entry appears
   at the bottom of the list.
8. Click the **Commuvent** header/logo to open the main page.
9. Click **Explore** → in **Search** type `AI Hack Night` → click the
   card.
10. Scroll down looking for a Feedback form.
    *Expect:* **no** feedback form — only an info note that feedback
    opens after the event ends.
11. Click your avatar (top-right) → **Sign out**.

### Recording

<video src="./videos/flow-h.mp4" controls playsinline muted width="640">
  Your browser doesn't support inline video.
  <a href="./videos/flow-h.mp4">Download the recording</a>.
</video>

---

## Flow I — Report + moderation hide

The Reports tab is **already populated** by the seed.

### Part 1 — Host hides a report (`host.alice`)

1. Run **Reset & sign-in** as `host.alice@demo.commuvent.app`.
2. Click **Dashboard** in the top nav.
3. Click **Moderation** in the dashboard header.
4. Click the **Reports** tab.
   *Expect:* a list with mixed `open` / `hidden` / `dismissed` rows.
5. On the first **open** event report, click **Hide**.
6. In the confirmation dialog, click **Hide**.
   *Expect:* status flips to `hidden`.
7. Click your avatar (top-right) → **Sign out**.

### Part 2 — Attendee files a fresh report (`att.henry`)

8. Run **Reset & sign-in** as `att.henry@demo.commuvent.app`.
9. Click **Explore** in the top nav.
10. Click any event card.
11. Scroll to the bottom of the event page.
12. Click **Report event**.
13. Pick reason `Spam`.
14. In the comment field, type `Looks like a spam listing.`.
15. Click **Submit report**.
    *Expect:* toast `Report submitted`.
16. Click your avatar (top-right) → **Sign out**.

### Recording

<video src="./videos/flow-i.mp4" controls playsinline muted width="640">
  Your browser doesn't support inline video.
  <a href="./videos/flow-i.mp4">Download the recording</a>.
</video>

---

## Flow J — Invite a member (two windows)

Use a second **private / incognito** window for Window 2.

### Window 1 — Host Alice

1. Run **Reset & sign-in** as `host.alice@demo.commuvent.app`.
2. Click **Dashboard** in the top nav.
3. Click **Members** in the dashboard header.
4. In the **Invite by link** card, find the **Checker** card.
5. Click **Create checker link**.
   *Expect:* toast `Invite link created`; a new row appears.
6. On the new row, click the **eye** icon to reveal the token.
7. Click the **copy** icon to copy the invite URL.

### Window 2 — Attendee Noah

8. Run **Reset & sign-in** as `att.noah@demo.commuvent.app`.
9. Paste the copied URL into the address bar and press Enter.
   *Expect:* an invite preview showing the host name, logo and role.
10. Click **Accept**.
    *Expect:* redirect to `/dashboard`; **Acme Tech Talks** now
    appears for Noah with **Checker** scope.
11. In **both** windows, click the avatar (top-right) → **Sign out**.

### Recording

<video src="./videos/flow-j.mp4" controls playsinline muted width="640">
  Your browser doesn't support inline video.
  <a href="./videos/flow-j.mp4">Download the recording</a>.
</video>

---

## Flow K — My Events aggregate

Run **Reset & sign-in** as `host.alice@demo.commuvent.app`.

1. Click **My Events** in the top nav.
   *Expect:* a list of all events where Alice has a role, with
   filters and per-row quick actions (Manage / Check-in).
2. In the **Search** field, type `Tech`.
3. In **From date**, pick **today**.
4. Click the **Past** time tab.
   *Expect:* the list narrows to past Tech-related events.
5. Click **Clear filters**.
   *Expect:* the full list returns.
6. Click your avatar (top-right) → **Sign out**.

### Recording

<video src="./videos/flow-k.mp4" controls playsinline muted width="640">
  Your browser doesn't support inline video.
  <a href="./videos/flow-k.mp4">Download the recording</a>.
</video>

---

## Done

If every flow above produced the expected outcome, the MVP requirements
(publishing, discovery, RSVP, tickets, waitlist + FIFO, roles, host
dashboard with stats + CSV, check-in with undo, gallery moderation,
post-event feedback, reports, invites, My Events) are all covered.
